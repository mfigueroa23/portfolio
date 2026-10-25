# Plan 009 — DevSecOps: CodeQL, Dependabot and SCA

- **Spec:** [spec.md](spec.md) (approved 2026-10-25)
- **Status:** Draft
- **Version:** 4.5.0 (feat → minor)

The plan only touches CI, repository settings and two Node scripts under `scripts/`; the site's
code, routes, CSP and budgets do not change (constitution §2, §3), and `test.yaml` keeps gating
`main` (§9). No dependency is added to `package.json` (§1): CodeQL, Grype and Syft run as pinned
GitHub Actions or downloaded CLIs inside CI, and the scripts use only Node's standard library. The
release keeps publishing `portfolio` and `portfolio-ssr` pinned by digest, now scanning them before
they reach Docker Hub (§10). The infra/CI approval (`.github/`, `release.yaml`, `Dockerfile`,
`scripts/`, `package.json` scripts) was granted on 2026-10-25. Still pending, as owner actions in
**Release**: a GitHub App for the bump, disabling CodeQL default setup, a ruleset on `main` and
the Dependabot labels. The Docker part of RF-13 was narrowed in the spec (D11).

## Modules

### New: `.github/workflows/codeql.yaml` (`CodeQL`)

| File          | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | RF                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `codeql.yaml` | Triggers: `pull_request` into `main`, `push` to `main`, `schedule` daily (`0 7 * * *` UTC) and `workflow_dispatch`. Job `Analyze (${{ matrix.language }})`, matrix `actions` and `javascript-typescript`, `build-mode: none` (no install, so no PR code runs; D1). `github/codeql-action/init` with `config-file: ./.github/codeql/codeql-config.yaml`, then `analyze` (uploads SARIF). Permissions: `contents: read`, `security-events: write`, `actions: read`. Actions pinned by SHA with a `# vX.Y.Z` comment. | RF-01–RF-05, RF-41 |

### New: `.github/codeql/codeql-config.yaml`

| File                 | Responsibility                                                                                        | RF           |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| `codeql-config.yaml` | `queries: [uses: security-extended]`; `paths-ignore`: `dist`, `node_modules`, `.angular`, `coverage`. | RF-01, RF-08 |

### New: `.github/dependabot.yml`

| File             | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | RF                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `dependabot.yml` | `version: 2`, three `updates` entries on `/`: `npm`, `github-actions`, `docker`. Each: `schedule` weekly, Monday 06:00 `America/Santiago`; `groups.<eco>-minor-patch` with `update-types: [minor, patch]` (`applies-to: version-updates`), so majors stay one per PR (D9); `commit-message.prefix` `build(deps)` (npm, also `prefix-development`; docker) or `ci(deps)` (actions), without `include: scope` (D10); `labels: [dependencies, npm \| github-actions \| docker]`. No auto-merge anywhere. | RF-10–RF-12, RF-14, RF-15, RF-17 |

### New: `.github/workflows/sca.yaml` (`SCA`)

| File       | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | RF                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `sca.yaml` | Triggers: `pull_request` into `main`, `schedule` daily (`30 7 * * *` UTC), `workflow_dispatch`. Job `Lockfile Scan`: checkout (no install, D1), download Grype (`anchore/scan-action/download-grype`, pinned), `grype file:pnpm-lock.yaml -o json=grype.json -o sarif=grype.sarif` (D4), `node scripts/sca-gate.mjs --report grype.json --title 'Lockfile'` (summary and exit code, D5), then `upload-sarif` with `category: sca-lockfile` under `if: always()` and only when the PR is not from a fork. Permissions: `contents: read`, `security-events: write`. | RF-26–RF-30, RF-36–RF-38, RF-41 |

### New: `scripts/sca-gate.mjs`

| File                | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | RF                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `sca-gate.mjs`      | CLI: `--report <grype.json>` (repeatable), `--exceptions` (default `.github/sca-exceptions.json`), `--title`. Exports pure functions: `validateExceptions(list, today)` → `{ valid, expired, invalid }` (an entry needs `id`, non-empty `reason` and an ISO `expires`; valid through that UTC day); `classify(match, exceptions)` → `blocking \| excepted \| reported` (blocking = `Critical`/`High` with `fix.state: fixed`; the exception matches `vulnerability.id` or any `relatedVulnerabilities[].id`, so a GHSA entry covers its CVE); `summary(...)` → Markdown table (package, installed, fixed in, severity, advisory, status) plus the expired and invalid entries. Appends to `$GITHUB_STEP_SUMMARY` when set, prints otherwise. Exit 1 on any blocking finding, invalid entry or unreadable report. | RF-28–RF-30, RF-33, RF-36–RF-38 |
| `sca-gate.test.mjs` | U-SG-1…U-SG-11 (`node:test`, fixtures inline).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |                                 |

### New: `.github/sca-exceptions.json`

| File                  | Responsibility                                                                                                                     | RF          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `sca-exceptions.json` | `[]` to start. Entry shape: `{ "id": "GHSA-…", "reason": "…", "expires": "YYYY-MM-DD" }`. Shared by lockfile and image scans (D5). | RF-36–RF-38 |

### New: `.github/workflows/dependabot-bump.yaml` (`Dependabot Version Bump`)

| File                   | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | RF                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `dependabot-bump.yaml` | Job `request` on `pull_request` (`opened`, `synchronize`, `reopened`) when `github.event.pull_request.user.login == 'dependabot[bot]'` and the actor is not the bump App: no checkout, `permissions: actions: write` only, runs `gh workflow run dependabot-bump.yaml --ref main -f pr=<number>` (D2). Job `bump` on `workflow_dispatch` (input `pr`, optional), `push` to `main` with `paths: [package.json]`, and `schedule` hourly as a fallback (D3): checkout `main` only, `actions/create-github-app-token` (`vars.BUMP_APP_ID`, `secrets.BUMP_APP_PRIVATE_KEY`), `node scripts/dependabot-bump.mjs [--pr N]`. `concurrency: dependabot-bump` without cancelling, so two runs never push the same branch at once. | RF-18, RF-20–RF-25, RF-41, RF-42 |

### New: `scripts/dependabot-bump.mjs`

| File                       | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | RF          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `dependabot-bump.mjs`      | Pure exports: `nextPatch(v)` (`X.Y.Z` → `X.Y.(Z+1)`, throws otherwise); `setVersion(text, v)` (replaces only the value of the first top-level `"version"` line, every other byte intact, D6); `isBumpCommit(subject)` (`chore(release): Bump version to v…`); `decide({ author, prVersion, mainVersion })` → `skip` (author is not `dependabot[bot]`), `noop` (already `main` + 1 patch) or `rebump`. Side-effect part (uses `git` and `gh` through `execFileSync`, never `pnpm`/`npm`, D1): lists open PRs by `app/dependabot` (or the one given), reads `main`'s and the PR's `package.json` with `git show`, and on `rebump` clones the PR branch into a temp dir, rebases its non-bump commits onto `origin/main` (bump commits dropped), writes the version, commits as the App and pushes with `--force-with-lease`. On rebase conflict or rejected push: aborts, pushes nothing, sets a failed `Version bump` commit status on the PR head and comments asking for `@dependabot recreate`. On success sets a `Version bump` success status on the new head. | RF-18–RF-24 |
| `dependabot-bump.test.mjs` | U-DB-1…U-DB-9 (`node:test`); the git part is exercised by E5–E9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |             |

### Changed: `.github/workflows/release.yaml`

| File           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | RF                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `release.yaml` | Job `package` (renamed `Build, Scan and Publish Images`), permissions `contents: read`, `security-events: write`: a `registry:2` service on `localhost:5000`; Buildx with `driver-opts: network=host`; both `build-push-action` steps push to `localhost:5000/portfolio[-ssr]:${{ github.sha }}` instead of Docker Hub (D7). New steps: download Grype and Syft (pinned); scan each image for `linux/amd64` and `linux/arm64` (`grype registry:… --platform …`, `GRYPE_REGISTRY_INSECURE_USE_HTTP=true`) into JSON and SARIF; `node scripts/sca-gate.mjs` over the four reports (fails the job before anything is published); `upload-sarif` per image and platform (`category: sca-image-<target>-<arch>`, `if: always()`); only then `docker/login-action` and `docker buildx imagetools create` copying each manifest list to the three Docker Hub tags (same digest); the `digest` and `ssr-digest` outputs read with `imagetools inspect`; Syft SBOMs (SPDX JSON, `--source-name <user>/portfolio[-ssr] --source-version <version>`) per platform, uploaded as artifacts `portfolio-<version>-sbom` and `portfolio-ssr-<version>-sbom` (D8). `verify` and `deploy` keep their steps; `deploy` still `needs: package`. | RF-31–RF-35, RF-40–RF-42 |

### Changed: other files

| File                             | Change                                                                                                                                                                                            | RF                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `.github/workflows/test.yaml`    | New step `Script Tests` (`node --test scripts/`) after `Run Tests`; every pinned action gets its `# vX.Y.Z` comment (D9). Triggers, install and the other steps unchanged.                        | RF-16, RF-39, RF-44 |
| `.github/workflows/release.yaml` | Same `# vX.Y.Z` comments on existing pins.                                                                                                                                                        | RF-16               |
| `Dockerfile`                     | Base images pinned as `tag@sha256:…` (`node:26-alpine` ×3, `perl:5-slim`, `nginx:stable-alpine`), so Dependabot can update floating tags through their digest (D9).                               | RF-10               |
| `package.json`                   | Script `"approve-builds": "pnpm approve-builds"` (interactive; approves or denies the pending build scripts and writes `allowBuilds` in `pnpm-workspace.yaml`, D12). `version` → `4.5.0`.         | RF-43               |
| `pnpm-workspace.yaml`            | A comment above `allowBuilds` pointing at `pnpm run approve-builds` and saying that CI installs fail on unapproved build scripts by design.                                                       | RF-43–RF-45         |
| `AGENTS.md`                      | Commands: `node --test scripts/` (script tests) and `pnpm run approve-builds` (after a dependency adds a build script). Closing checklist: `node --test scripts/` passes when `scripts/` changes. | RF-43               |

### Infrastructure (owner, outside the repo)

| Item              | Change                                                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub App        | `portfolio-version-bump`, installed only on `mfigueroa23/portfolio`: Contents, Pull requests, Commit statuses and Workflows read/write (Workflows is needed to rebase Actions updates). `BUMP_APP_ID` as an Actions variable, `BUMP_APP_PRIVATE_KEY` as an Actions secret (not a Dependabot secret, D2). |
| Code scanning     | Default setup disabled (`gh api -X PATCH repos/mfigueroa23/portfolio/code-scanning/default-setup -f state=not-configured`).                                                                                                                                                                              |
| Ruleset on `main` | Required checks `Unit Tests`, `Lockfile Scan`, `Analyze (actions)`, `Analyze (javascript-typescript)`; code scanning rule for CodeQL with security alerts `high_or_higher` and alerts `none` (D4).                                                                                                       |
| Labels            | `npm`, `github-actions`, `docker` (and `dependencies` if missing).                                                                                                                                                                                                                                       |

## Decisions

| #   | Decision                                                                                                                                                                                                      | Discarded alternative                                                             | Why                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | No job that holds a write token or a secret installs dependencies or runs code from a PR: CodeQL uses `build-mode: none`, SCA scans the lockfile file, the bump only runs `git`/`gh` and scripts from `main`. | Installing (`pnpm install`) before analysing, or bumping with `npm version`       | RF-25 and RF-42: `pnpm install` runs approved build scripts and `npm version` runs the PR's `preversion`/`version` scripts. JS/TS CodeQL does not need a build.                                                                                              |
| D2  | The Dependabot-triggered run only dispatches `dependabot-bump.yaml` on `main` (`actions: write`, no checkout); the dispatched run, outside Dependabot's context, holds the App token.                         | A Dependabot secret with the App key used directly in the `pull_request` run      | RF-42 forbids any secret in Dependabot PR runs; the dispatched run executes `main`'s workflow and scripts, not the PR's (RF-25).                                                                                                                             |
| D3  | A GitHub App token pushes the bump, plus a `push`-to-`main` trigger and an hourly schedule that re-check every open Dependabot PR.                                                                            | Pushing with `GITHUB_TOKEN`                                                       | Commits pushed with `GITHUB_TOKEN` trigger no workflows, so the bumped head would have no `test.yaml`/CodeQL/SCA results and the ruleset would block it forever. The `push` trigger covers RF-20; the schedule covers a dispatch that never arrived (Risks). |
| D4  | Grype for vulnerabilities (lockfile and images) and Syft for SBOMs, as pinned CLIs; CodeQL gating by the native code scanning ruleset rule.                                                                   | Trivy (one tool for all three); a script that parses CodeQL SARIF to fail the job | Trivy's actions and a release were compromised in March 2026; Anchore's tools cover the same scope with SARIF and SPDX output. The ruleset rule compares the PR with `main` natively, which is exactly "introduces an alert" (RF-06, RF-07).                 |
| D5  | Own exceptions file and gate script (`sca-gate.mjs`) applied to Grype's JSON, instead of the scanner's ignore list.                                                                                           | Grype's `ignore` rules in `.grype.yaml`                                           | Grype's ignore rules have no expiry and drop the finding from the report; RF-36 asks to report it as excepted, RF-37 to name expired entries, RF-38 to reject incomplete ones. One file serves both scans.                                                   |
| D6  | `setVersion` edits only the value of the top-level `"version"` line in the text.                                                                                                                              | Parse and re-serialise `package.json` (`JSON.stringify`, `jq`)                    | RF-19: re-serialising can reorder or re-escape and leave Prettier-dirty output; a line edit keeps every other byte.                                                                                                                                          |
| D7  | Images go to a local `registry:2` first, are scanned there and copied to Docker Hub with `imagetools create`.                                                                                                 | Push to Docker Hub with a candidate tag, or rebuild from cache after scanning     | RF-32 forbids publishing before the scan; a rebuild may not produce the same bytes. Copying the manifest list keeps the scanned digest, which `deploy` pins (RF-40).                                                                                         |
| D8  | SBOM in SPDX JSON, one per platform, grouped in one artifact per image and version.                                                                                                                           | CycloneDX                                                                         | Both meet RF-34; SPDX is what GitHub's dependency graph exports, so the formats in the repo stay one. Per platform because the arm64 and amd64 layers differ.                                                                                                |
| D9  | Base images pinned as `tag@digest` and existing action pins annotated with `# vX.Y.Z`.                                                                                                                        | Leaving floating tags (`stable-alpine`) and bare SHAs                             | With a floating tag Dependabot has nothing to propose (RF-10); with a digest it opens a PR when the tag moves. The version comment lets Dependabot and the reviewer see the version it moves from and to (RF-16).                                            |
| D10 | Commit prefixes `build(deps)` and `ci(deps)` written literally, without `include: scope`.                                                                                                                     | `prefix: build` + `include: scope`                                                | `include: scope` yields `build(deps-dev)` for devDependencies; RF-14 asks for `build(deps)` for all npm updates.                                                                                                                                             |
| D11 | Docker security updates are not configured: base-image risk is covered by the weekly digest updates (RF-10) and the release image scan (RF-31, RF-32).                                                        | A custom daily image scan that opens PRs                                          | GitHub's advisory database has no container-image advisories, so Dependabot cannot open Docker security updates; RF-13 holds for npm and Actions only. RF-13 narrowed accordingly in the spec (approved 2026-10-25).                                         |
| D12 | `pnpm run approve-builds` wraps pnpm's interactive `approve-builds`; CI keeps pnpm's default of failing the install on unapproved build scripts.                                                              | `pnpm approve-builds --all` in CI, or `--ignore-scripts` installs                 | RF-44 holds because the four current builds are approved; RF-45 needs a new script to fail until the owner approves it, which auto-approval or ignoring scripts would hide.                                                                                  |

## RF coverage

| RF                  | Where                                                       | Tests              |
| ------------------- | ----------------------------------------------------------- | ------------------ |
| RF-01               | `codeql.yaml`, `codeql-config.yaml`                         | E1                 |
| RF-02, RF-03, RF-04 | `codeql.yaml` triggers                                      | E1, E13            |
| RF-05               | `codeql.yaml` (`analyze` uploads)                           | E1, E13            |
| RF-06, RF-07        | Ruleset code scanning rule (D4)                             | E1, E2             |
| RF-08               | `codeql-config.yaml` `paths-ignore`                         | E1                 |
| RF-09               | Default setup disabled (Release step 2)                     | E13                |
| RF-10               | `dependabot.yml`, `Dockerfile` digests (D9)                 | E5                 |
| RF-11, RF-12        | `dependabot.yml` `groups`                                   | E5                 |
| RF-13               | Repo security updates + `dependabot.yml` (D11)              | E5                 |
| RF-14, RF-15        | `dependabot.yml` `commit-message`, `labels`                 | E5                 |
| RF-16               | Dependabot `github-actions` + `# vX.Y.Z` comments           | E5                 |
| RF-17               | No auto-merge configured                                    | E5                 |
| RF-18, RF-19        | `dependabot-bump.mjs` (`nextPatch`, `setVersion`)           | U-DB-1–U-DB-4, E5  |
| RF-20               | `bump` on `push` to `main`                                  | U-DB-6, E6         |
| RF-21               | `decide` → `noop`                                           | U-DB-5, E5         |
| RF-22               | `request` on `synchronize` after recreate                   | U-DB-7, E7         |
| RF-23               | `request` condition, `decide` → `skip`                      | U-DB-8, E8         |
| RF-24               | Conflict/rejected push path, `Version bump` status          | U-DB-9, E9         |
| RF-25               | D1, D2                                                      | E5 (review)        |
| RF-26, RF-27        | `sca.yaml` triggers                                         | E3, E13            |
| RF-28, RF-29        | `sca-gate.mjs` `classify`                                   | U-SG-1–U-SG-4, E3  |
| RF-30               | `sca-gate.mjs` `summary`, `upload-sarif`                    | U-SG-10, E3        |
| RF-31               | `release.yaml` scan steps                                   | E10                |
| RF-32               | Gate before login and `imagetools create`                   | U-SG-1, E11        |
| RF-33               | Gate passes, SARIF and summary                              | U-SG-2, E10        |
| RF-34, RF-35        | Syft steps, `upload-artifact`                               | E10                |
| RF-36               | `validateExceptions`, `classify` → `excepted`               | U-SG-5, U-SG-6, E4 |
| RF-37               | Expired entries                                             | U-SG-7, E4         |
| RF-38               | Invalid entries                                             | U-SG-8, U-SG-9, E4 |
| RF-39               | `test.yaml` unchanged gates                                 | E5, E12            |
| RF-40               | `release.yaml` outputs, `deploy` unchanged                  | E10                |
| RF-41               | `permissions` blocks, SHA pins in every workflow            | E14 (review)       |
| RF-42               | D2; no secret referenced by `pull_request` jobs             | E14 (review)       |
| RF-43               | `approve-builds` script                                     | E12                |
| RF-44               | Approved `allowBuilds`, `test.yaml`/`release.yaml` installs | E10, E12           |
| RF-45               | pnpm default on unapproved builds (D12)                     | E12                |

## Test strategy

**Unit** (`node --test scripts/`, no network, run by `test.yaml`):

- `sca-gate.test.mjs`
  - U-SG-1 — A `High` match with `fix.state: fixed` is `blocking`; the CLI exits 1.
  - U-SG-2 — A `Critical` match with `fix.state: not-fixed` is `reported`; exit 0.
  - U-SG-3 — A `Medium` match with a fix is `reported`; exit 0.
  - U-SG-4 — An empty `matches` array passes and prints "no findings".
  - U-SG-5 — A valid exception for the match's `vulnerability.id` makes it `excepted`; exit 0.
  - U-SG-6 — An exception for a GHSA covers the match whose `relatedVulnerabilities` include it.
  - U-SG-7 — An exception that expired yesterday is listed as expired and the finding is `blocking`; one expiring today is valid.
  - U-SG-8 — An entry without `reason` (or empty) is invalid, named in the output, exit 1 even with no findings.
  - U-SG-9 — An entry without `id` or with a non-ISO `expires` is invalid.
  - U-SG-10 — The summary has one row per finding with package, installed, fixed in, severity, advisory and status, and several `--report` files are merged under their titles.
  - U-SG-11 — A missing or malformed report exits 1 with a one-line error, no stack trace.
- `dependabot-bump.test.mjs`
  - U-DB-1 — `nextPatch('4.4.0')` is `4.4.1`; `nextPatch('4.4.9')` is `4.4.10`.
  - U-DB-2 — `nextPatch` throws on `4.4`, `v4.4.0` or a pre-release.
  - U-DB-3 — `setVersion` changes only the version value of the current `package.json` text; the rest is byte-identical.
  - U-DB-4 — `setVersion` ignores a nested `"version"` key further down.
  - U-DB-5 — `decide` returns `noop` when the PR version is `main` + 1 patch.
  - U-DB-6 — `decide` returns `rebump` when `main` moved (PR `4.5.1`, `main` `4.5.1`).
  - U-DB-7 — `decide` returns `rebump` when the PR has `main`'s version (bump lost on recreate).
  - U-DB-8 — `decide` returns `skip` for any author other than `dependabot[bot]`.
  - U-DB-9 — `isBumpCommit` recognises the bump subject and nothing else (`chore(release): Version 4.4.0` is not one).

**End to end** (on GitHub, during the release of this feature; no fake can emulate Dependabot, code scanning or the registry):

- E1 — Throwaway PR writing a route parameter into `innerHTML`: CodeQL reports a high alert and the PR is blocked; removing it unblocks. `dist/` findings never appear.
- E2 — Throwaway PR with a medium-only alert: checks pass, alert visible in Security.
- E3 — Throwaway PR pinning a package to a version with a fixed high advisory: `Lockfile Scan` fails with the table in the summary and the alert in Security.
- E4 — Same PR plus a valid exception: passes and lists it as excepted; with a past `expires`: fails naming the entry; without `reason`: fails naming the entry.
- E5 — "Check for updates" in Dependabot: grouped minor/patch PR per ecosystem with the right prefix and labels, majors apart, Actions still SHA-pinned; each PR gets exactly one bump commit to `main` + 1 patch, and a new head with green checks; a re-run adds no commit.
- E6 — Merge one Dependabot PR: the other open ones are re-bumped to the new version within minutes.
- E7 — `@dependabot recreate`: the bump commit comes back.
- E8 — A PR from a feature branch is never touched by the bump workflow.
- E9 — Force a conflict (edit the PR's `package.json` dependencies on `main`): no push, failed `Version bump` status and a comment.
- E10 — Merge this feature: the release scans both images on both platforms, publishes with the same digests the deploy pins, `rollout status` passes, and two SBOM artifacts exist named with `4.5.0`.
- E11 — Run `grype` and `sca-gate.mjs` locally against an old `node` image with known fixed highs: exit 1; check in the YAML that login and `imagetools create` come after the gate. (Forcing a blocking finding in the real release would mean deploying on purpose.)
- E12 — Throwaway PR adding a package with a `postinstall` script: `test.yaml` fails naming it; `pnpm run approve-builds` and a commit make it pass.
- E13 — Next day: scheduled CodeQL and SCA runs in Actions; no "default setup" CodeQL run.
- E14 — Review: every workflow has `permissions`, every third-party action is SHA-pinned, no `secrets.` in a job reachable from a Dependabot `pull_request` run.

## Implementation order

1. `scripts/sca-gate.mjs` and its tests; `.github/sca-exceptions.json`.
2. `scripts/dependabot-bump.mjs` and its tests.
3. `test.yaml`: `Script Tests` step and version comments on pins.
4. `codeql.yaml` and `codeql-config.yaml`.
5. `sca.yaml`.
6. `dependabot-bump.yaml`.
7. `release.yaml`: local registry, scans, gate, SARIF, copy to Docker Hub, SBOMs; version comments.
8. `Dockerfile` digests; `dependabot.yml`.
9. `package.json` `approve-builds` script, `pnpm-workspace.yaml` comment, `AGENTS.md` commands.
10. Closing checklist, then `chore(release): Bump version to v4.5.0`.

## Release

1. Create the GitHub App, install it on the repo, store `BUMP_APP_ID` and `BUMP_APP_PRIVATE_KEY`; create the labels.
2. When the PR is opened, disable CodeQL default setup (an advanced-setup upload is rejected while default setup is on).
3. Check that `CodeQL`, `SCA` and `Portfolio Tests` pass on the PR (E1–E4, E12 on throwaway branches off it).
4. Create the ruleset on `main` with the required checks and the code scanning rule, using the check names the PR shows.
5. Merge; watch the release (E10). On failure in the new steps, revert the merge: the previous `release.yaml` publishes as before.
6. Trigger Dependabot from the dependency graph (E5–E9); next day E13.
7. `/tag-release` 4.5.0.

## Risks

- **Dispatch treated as Dependabot-triggered:** if GitHub withholds secrets from the run dispatched by a Dependabot run (D2), the bump only arrives with the hourly schedule. Mitigation: the schedule (D3); if the delay is unacceptable, using a Dependabot secret needs a spec change to RF-42.
- **`imagetools create` from an HTTP registry:** if Buildx refuses the local `localhost:5000` source, copy with `crane copy` (downloaded and pinned) instead; the digest is preserved either way.
- **Grype database download fails:** the scan fails and the release stops (fail closed). Mitigation: cache the DB between runs keyed by date; retry once.
- **False positives in base images blocking a release:** add a time-boxed exception (D5); exceptions are reviewed in the PR that adds them.
- **Dependabot rebase stops after the bump commit:** Dependabot does not auto-rebase branches with foreign commits; conflicts surface as a failed `Version bump` status with the `@dependabot recreate` hint (RF-24).
- **Dependabot and pnpm 12:** the lockfile is v9, which Dependabot supports; if its updater fails on `allowBuilds` or `packageManager: pnpm@12.6.0`, the npm PRs will not appear (E5 shows it) and the npm part of RF-10–RF-13 needs a decision.
- **Release time:** four scans and two SBOMs add an estimated 3–5 minutes to `package`.
- **Prefix format:** if Dependabot renders `build(deps)` differently from D10's expectation (for example lowercasing "bump"), the subjects still follow Conventional Commits; only casing differs from the repo's own commits.
