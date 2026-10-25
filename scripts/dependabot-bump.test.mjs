// Unit tests of dependabot-bump.mjs (Spec 009, plan U-DB-1…U-DB-12). Run with `node --test scripts/`.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { decide, isBumpCommit, nextPatch, rebump, setVersion } from './dependabot-bump.mjs';

const PACKAGE_JSON = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const CURRENT = JSON.parse(PACKAGE_JSON).version;

describe('nextPatch', () => {
  it('U-DB-1: increases the patch number', () => {
    assert.equal(nextPatch('4.4.0'), '4.4.1');
    assert.equal(nextPatch('4.4.9'), '4.4.10');
    assert.equal(nextPatch('10.0.99'), '10.0.100');
  });

  it('U-DB-2: rejects anything that is not X.Y.Z', () => {
    for (const version of ['4.4', 'v4.4.0', '4.4.0-rc.1', '4.4.0+build', '', undefined]) {
      assert.throws(() => nextPatch(version), /not an X\.Y\.Z version/);
    }
  });
});

describe('setVersion', () => {
  it('U-DB-3: changes only the version value of package.json', () => {
    const updated = setVersion(PACKAGE_JSON, '9.9.9');
    assert.equal(JSON.parse(updated).version, '9.9.9');
    assert.equal(updated, PACKAGE_JSON.replace(`"version": "${CURRENT}"`, '"version": "9.9.9"'));
    assert.equal(updated.length, PACKAGE_JSON.length - CURRENT.length + 5);
  });

  it('U-DB-4: ignores a nested "version" key and fails without a top-level one', () => {
    const text =
      '{\n  "name": "x",\n  "version": "1.0.0",\n  "engines": {\n    "version": "2.0.0"\n  }\n}\n';
    assert.equal(
      setVersion(text, '1.0.1'),
      text.replace('"version": "1.0.0"', '"version": "1.0.1"'),
    );
    const nestedOnly = '{\n  "name": "x",\n  "engines": {\n    "version": "2.0.0"\n  }\n}\n';
    assert.throws(() => setVersion(nestedOnly, '1.0.1'), /no top-level "version"/);
  });
});

describe('decide', () => {
  it('U-DB-5: noop when the PR already has main + 1 patch', () => {
    assert.equal(
      decide({ author: 'dependabot[bot]', prVersion: '4.5.1', mainVersion: '4.5.0' }),
      'noop',
    );
  });

  it('U-DB-6: rebump when main moved to the PR version', () => {
    assert.equal(
      decide({ author: 'dependabot[bot]', prVersion: '4.5.1', mainVersion: '4.5.1' }),
      'rebump',
    );
    assert.equal(
      decide({ author: 'app/dependabot', prVersion: '4.5.1', mainVersion: '4.6.0' }),
      'rebump',
    );
  });

  it('U-DB-7: rebump when the PR has main version (bump lost on recreate)', () => {
    assert.equal(
      decide({ author: 'dependabot[bot]', prVersion: '4.5.0', mainVersion: '4.5.0' }),
      'rebump',
    );
  });

  it('U-DB-8: skip any PR not authored by Dependabot', () => {
    for (const author of [
      'mfigueroa23',
      'github-actions[bot]',
      'portfolio-version-bump[bot]',
      '',
    ]) {
      assert.equal(decide({ author, prVersion: '4.5.0', mainVersion: '4.5.0' }), 'skip');
    }
  });
});

describe('isBumpCommit', () => {
  it('U-DB-9: recognises the bump subject and nothing else', () => {
    assert.equal(isBumpCommit('chore(release): Bump version to v4.5.1'), true);
    assert.equal(isBumpCommit('chore(release): Version 4.4.0'), false);
    assert.equal(isBumpCommit('chore(release): Bump version to v4.5'), false);
    assert.equal(isBumpCommit('build(deps): bump the npm-minor-patch group with 3 updates'), false);
    assert.equal(isBumpCommit('chore(release): Bump version to v4.5.1 and more'), false);
  });
});

/**
 * A bare `origin` with `main` at 1.0.0 and a Dependabot-like branch (one dependency commit and a
 * stale bump commit), plus a working clone with every ref fetched, as the script sees it.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'dependabot-bump-test-'));
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const origin = join(root, 'origin.git');
  const seed = join(root, 'seed');
  git(root, 'init', '--quiet', '--bare', '--initial-branch=main', origin);
  git(root, 'clone', '--quiet', origin, seed);
  for (const [key, value] of [
    ['user.name', 'Test'],
    ['user.email', 'test@example.com'],
  ]) {
    git(seed, 'config', key, value);
  }
  const write = (name, text) => writeFileSync(join(seed, name), text);
  const pkg = (version, dep) =>
    `{\n  "name": "x",\n  "version": "${version}",\n  "dependencies": {\n    "dep": "${dep}"\n  }\n}\n`;
  const commit = (message) => {
    git(seed, 'add', '-A');
    git(seed, 'commit', '--quiet', '-m', message);
  };
  write('package.json', pkg('1.0.0', '^1.0.0'));
  write('README.md', 'main\n');
  commit('feat: Initial');
  git(seed, 'push', '--quiet', 'origin', 'main');
  git(seed, 'checkout', '--quiet', '-b', 'dependabot/npm/dep-2.0.0');
  write('package.json', pkg('1.0.0', '^2.0.0'));
  commit('build(deps): bump dep from 1.0.0 to 2.0.0');
  write('package.json', pkg('1.0.1', '^2.0.0'));
  commit('chore(release): Bump version to v1.0.1');
  git(seed, 'push', '--quiet', 'origin', 'HEAD');
  git(seed, 'checkout', '--quiet', 'main');

  const work = join(root, 'work');
  git(root, 'clone', '--quiet', '--no-checkout', origin, work);
  for (const [key, value] of [
    ['user.name', 'Bump'],
    ['user.email', 'bump@example.com'],
  ]) {
    git(work, 'config', key, value);
  }
  const pr = {
    number: 1,
    headRefName: 'dependabot/npm/dep-2.0.0',
    headRefOid: git(seed, 'rev-parse', 'dependabot/npm/dep-2.0.0'),
  };
  return { git, seed, work, pr, write, pkg, commit, origin };
}

describe('rebump', () => {
  it('U-DB-10: rebuilds the branch on main with one bump commit, dropping the stale one', () => {
    const { git, seed, work, pr, write, pkg, commit } = fixture();
    // main moves to 1.0.1 (another Dependabot PR merged) and gains an unrelated change.
    write('package.json', pkg('1.0.1', '^1.0.0'));
    write('README.md', 'main moved\n');
    commit('chore(release): Bump version to v1.0.1');
    git(seed, 'push', '--quiet', 'origin', 'main');
    git(work, 'fetch', '--quiet', 'origin');

    const pushed = rebump(work, process.env, pr, '1.0.2');
    const subjects = git(work, 'log', '--format=%s', `origin/main..${pushed}`).split('\n');
    assert.deepEqual(subjects, [
      'chore(release): Bump version to v1.0.2',
      'build(deps): bump dep from 1.0.0 to 2.0.0',
    ]);
    git(work, 'fetch', '--quiet', 'origin');
    assert.equal(git(work, 'rev-parse', `origin/${pr.headRefName}`), pushed);
    const packageJson = JSON.parse(git(work, 'show', `${pushed}:package.json`));
    assert.equal(packageJson.version, '1.0.2');
    assert.equal(packageJson.dependencies.dep, '^2.0.0');
    assert.equal(git(work, 'show', `${pushed}:README.md`), 'main moved');
  });

  it('U-DB-11: pushes nothing when a Dependabot commit does not apply on main', () => {
    const { git, seed, work, pr, write, pkg, commit } = fixture();
    write('package.json', pkg('1.1.0', '^1.5.0'));
    commit('build(deps): bump dep from 1.0.0 to 1.5.0');
    git(seed, 'push', '--quiet', 'origin', 'main');
    git(work, 'fetch', '--quiet', 'origin');

    assert.throws(() => rebump(work, process.env, pr, '1.1.1'), /does not apply on main/);
    git(work, 'fetch', '--quiet', 'origin');
    assert.equal(git(work, 'rev-parse', `origin/${pr.headRefName}`), pr.headRefOid);
  });

  it('U-DB-12: pushes nothing when the branch moved after it was read (lease)', () => {
    const { git, seed, work, pr, write, commit } = fixture();
    git(work, 'fetch', '--quiet', 'origin');
    git(seed, 'checkout', '--quiet', pr.headRefName);
    write('extra.txt', 'pushed meanwhile\n');
    commit('build(deps): bump other');
    git(seed, 'push', '--quiet', 'origin', 'HEAD');

    assert.throws(() => rebump(work, process.env, pr, '1.0.1'), /push was rejected/);
    assert.notEqual(git(seed, 'rev-parse', 'HEAD'), pr.headRefOid);
    git(work, 'fetch', '--quiet', 'origin');
    assert.equal(
      git(work, 'rev-parse', `origin/${pr.headRefName}`),
      git(seed, 'rev-parse', 'HEAD'),
    );
  });
});
