// Keeps every open Dependabot PR one patch version above `main` (Spec 009, RF-18 to RF-25).
//
// For each open PR authored by Dependabot (or only `--pr N`), it compares the PR's
// `package.json` version with `main`'s. When it is not `main` + 1 patch, it rebuilds the branch
// in a temporary clone: Dependabot's commits are cherry-picked onto `origin/main` without any
// earlier bump commit, and one `chore(release): Bump version to vX.Y.Z` commit is added on top
// and force-pushed with a lease on the head it read. A conflict or a rejected push leaves the
// branch as it was, sets a failed `Version bump` commit status and asks for
// `@dependabot recreate` in a comment.
//
// It only runs `git` and `gh`: nothing from the PR is installed or executed (plan D1), and
// `package.json` is edited as text, so no npm lifecycle script runs (plan D6).
//
// Environment: GH_TOKEN (the bump App's token), GITHUB_REPOSITORY (owner/repo),
// BUMP_GIT_NAME and BUMP_GIT_EMAIL (the App's commit identity).
//
// Usage: node scripts/dependabot-bump.mjs [--pr <number>]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const STATUS_CONTEXT = 'Version bump';
const DEPENDABOT_LOGINS = new Set(['dependabot[bot]', 'app/dependabot', 'dependabot']);
const BUMP_SUBJECT = /^chore\(release\): Bump version to v\d+\.\d+\.\d+$/;
// The top-level "version" of a Prettier-formatted package.json is indented by two spaces.
const VERSION_LINE = /^( {2}"version": ")[^"]*(")/m;

/** `X.Y.Z` → `X.Y.(Z+1)`. */
export function nextPatch(version) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!parts) throw new Error(`${JSON.stringify(version)} is not an X.Y.Z version`);
  return `${parts[1]}.${parts[2]}.${Number(parts[3]) + 1}`;
}

/** The package.json text with only its top-level version value replaced. */
export function setVersion(text, version) {
  if (!VERSION_LINE.test(text)) throw new Error('package.json has no top-level "version" line');
  return text.replace(VERSION_LINE, `$1${version}$2`);
}

export const isBumpCommit = (subject) => BUMP_SUBJECT.test(subject);

/** `skip` (not Dependabot's), `noop` (already main + 1 patch) or `rebump`. */
export function decide({ author, prVersion, mainVersion }) {
  if (!DEPENDABOT_LOGINS.has(author)) return 'skip';
  return prVersion === nextPatch(mainVersion) ? 'noop' : 'rebump';
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });

const gh = (...args) => run('gh', args);

/** Git with the App token sent as a header, so it never appears in argv or remotes. */
function gitEnv(token) {
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    ...process.env,
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
    GIT_TERMINAL_PROMPT: '0',
  };
}

function openPullRequests(repo, number) {
  const fields = 'number,headRefName,headRefOid,author,state,isCrossRepository';
  const list = number
    ? [JSON.parse(gh('pr', 'view', String(number), '--repo', repo, '--json', fields))]
    : JSON.parse(
        gh(
          'pr',
          'list',
          '--repo',
          repo,
          '--author',
          'app/dependabot',
          '--state',
          'open',
          '--base',
          'main',
          '--limit',
          '100',
          '--json',
          fields,
        ),
      );
  return list.filter((pr) => pr.state === 'OPEN' && !pr.isCrossRepository);
}

function versionAt(dir, env, ref) {
  return JSON.parse(run('git', ['show', `${ref}:package.json`], { cwd: dir, env })).version;
}

function statusOf(repo, sha) {
  const statuses = JSON.parse(gh('api', `repos/${repo}/commits/${sha}/status`)).statuses ?? [];
  return statuses.find((status) => status.context === STATUS_CONTEXT)?.state;
}

function setStatus(repo, sha, state, description) {
  gh(
    'api',
    `repos/${repo}/statuses/${sha}`,
    '-f',
    `state=${state}`,
    '-f',
    `context=${STATUS_CONTEXT}`,
    '-f',
    `description=${description}`,
  );
}

/** Rebuilds the PR branch on origin/main with one bump commit; returns the pushed SHA. */
export function rebump(dir, env, pr, version) {
  const git = (...args) => run('git', args, { cwd: dir, env });
  const range = git('log', '--reverse', '--format=%H %P%x09%s', `origin/main..${pr.headRefOid}`);
  const commits = range
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hashes, subject] = line.split('\t');
      const [sha, ...parents] = hashes.split(' ');
      return { sha, parents, subject };
    })
    .filter((commit) => !isBumpCommit(commit.subject));
  if (commits.length === 0) throw new Error('the branch has no Dependabot commit to keep');
  if (commits.some((commit) => commit.parents.length > 1)) {
    throw new Error('the branch has a merge commit');
  }

  git('checkout', '--quiet', '-B', 'bump', 'origin/main');
  for (const { sha } of commits) {
    try {
      git('cherry-pick', '--allow-empty', sha);
    } catch {
      git('cherry-pick', '--abort');
      throw new Error(`commit ${sha.slice(0, 7)} does not apply on main`);
    }
  }

  const file = join(dir, 'package.json');
  writeFileSync(file, setVersion(readFileSync(file, 'utf8'), version));
  git(
    'commit',
    '--quiet',
    '--only',
    'package.json',
    '-m',
    `chore(release): Bump version to v${version}`,
  );
  try {
    git(
      'push',
      '--quiet',
      `--force-with-lease=${pr.headRefName}:${pr.headRefOid}`,
      'origin',
      `HEAD:${pr.headRefName}`,
    );
  } catch {
    throw new Error('the push was rejected (the branch changed or the App cannot push to it)');
  }
  return git('rev-parse', 'HEAD').trim();
}

function processPullRequest(repo, dir, env, pr) {
  const git = (...args) => run('git', args, { cwd: dir, env });
  git(
    'fetch',
    '--quiet',
    'origin',
    'main',
    `+refs/heads/${pr.headRefName}:refs/remotes/origin/${pr.headRefName}`,
  );
  const head = git('rev-parse', `origin/${pr.headRefName}`).trim();
  if (head !== pr.headRefOid)
    return `#${pr.number}: the branch moved while reading it, left for the next run`;

  const mainVersion = versionAt(dir, env, 'origin/main');
  const prVersion = versionAt(dir, env, head);
  const action = decide({ author: pr.author.login, prVersion, mainVersion });
  if (action === 'skip') return `#${pr.number}: not authored by Dependabot, skipped`;

  const version = nextPatch(mainVersion);
  if (action === 'noop') {
    if (statusOf(repo, head) !== 'success') setStatus(repo, head, 'success', `Version ${version}`);
    return `#${pr.number}: already at ${version}`;
  }

  try {
    const pushed = rebump(dir, env, pr, version);
    setStatus(repo, pushed, 'success', `Version ${version}`);
    return `#${pr.number}: ${prVersion} → ${version}`;
  } catch (error) {
    git('reset', '--quiet', '--hard');
    // One failed status and one comment per head, not one per run.
    if (statusOf(repo, head) !== 'failure') {
      setStatus(repo, head, 'failure', `Cannot bump to ${version}: ${error.message}`.slice(0, 140));
      gh(
        'pr',
        'comment',
        String(pr.number),
        '--repo',
        repo,
        '--body',
        `The version bump to \`v${version}\` could not be applied: ${error.message}. ` +
          'Comment `@dependabot recreate` to rebuild this PR on top of `main`; the bump is added again afterwards.',
      );
    }
    throw new Error(`#${pr.number}: ${error.message}`);
  }
}

function main(argv) {
  const prIndex = argv.indexOf('--pr');
  const number = prIndex >= 0 ? Number(argv[prIndex + 1]) : undefined;
  if (prIndex >= 0 && !Number.isInteger(number)) throw new Error('--pr needs a PR number');
  const { GH_TOKEN: token, GITHUB_REPOSITORY: repo, BUMP_GIT_NAME, BUMP_GIT_EMAIL } = process.env;
  if (!token || !repo || !BUMP_GIT_NAME || !BUMP_GIT_EMAIL) {
    throw new Error('GH_TOKEN, GITHUB_REPOSITORY, BUMP_GIT_NAME and BUMP_GIT_EMAIL are required');
  }

  const pullRequests = openPullRequests(repo, number);
  console.log(`${pullRequests.length} open Dependabot PR(s)`);
  if (pullRequests.length === 0) return 0;

  const dir = mkdtempSync(join(tmpdir(), 'dependabot-bump-'));
  const env = gitEnv(token);
  let failures = 0;
  try {
    run('git', ['clone', '--quiet', '--no-checkout', `https://github.com/${repo}.git`, dir], {
      env,
    });
    run('git', ['config', 'user.name', BUMP_GIT_NAME], { cwd: dir });
    run('git', ['config', 'user.email', BUMP_GIT_EMAIL], { cwd: dir });
    for (const pr of pullRequests) {
      try {
        console.log(processPullRequest(repo, dir, env, pr));
      } catch (error) {
        failures++;
        console.error(error.message.split('\n')[0]);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return failures > 0 ? 1 : 0;
}

if (import.meta.main) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`dependabot-bump: ${error.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
