# Tasks 009 — DevSecOps: CodeQL, Dependabot and SCA

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Order:** by dependency. A task starts only when the tasks under "Depends on" are done. Tasks with the same dependencies can run in parallel.
- **Ids:** `D#` = plan decision, `U-*` / `E#` = tests listed in the plan's test strategy.

## Phase 0 — Gate

- [x] **T01 — Resolve the Docker security-updates conflict**
  - **RF:** RF-13
  - **Depends on:** —
  - **Scope:** The owner accepts or rejects D11: Dependabot cannot open Docker security updates, so RF-13 applies to npm and Actions, with base images covered by weekly digest updates (D9) and the release scan (RF-31, RF-32). If accepted, record it in the spec's Decisions (RF-13 wording narrowed); if rejected, update the plan before T10.
  - **Done when:** `spec.md` states RF-13's scope for Docker explicitly, and the plan's D11 matches it.

- [x] **T02 — Owner setup: bump App and labels**
  - **RF:** RF-15, RF-18
  - **Depends on:** — (can run in parallel with T01)
  - **Scope:** Confirm the GitHub App `portfolio-version-bump` is installed only on `mfigueroa23/portfolio` with Contents, Pull requests, Commit statuses and Workflows read/write; `BUMP_APP_ID` exists as an Actions **variable** and `BUMP_APP_PRIVATE_KEY` as an Actions **secret** (not a Dependabot secret, D2). Create the labels `npm`, `github-actions`, `docker` (and `dependencies` if missing).
  - **Done when:** `gh variable list` shows `BUMP_APP_ID`, `gh secret list` shows `BUMP_APP_PRIVATE_KEY` (and `gh secret list --app dependabot` does not), `gh label list` shows the four labels, and the App's installation page lists the four permissions.

## Phase 1 — Scripts

- [x] **T03 — SCA gate script and exceptions file**
  - **RF:** RF-28, RF-29, RF-30, RF-33, RF-36, RF-37, RF-38
  - **Depends on:** — (can run in parallel with T01, T02, T04)
  - **Scope:** `scripts/sca-gate.mjs` (`validateExceptions`, `classify`, `summary`, CLI with `--report` repeatable, `--exceptions`, `--title`, `$GITHUB_STEP_SUMMARY`; D5), `scripts/sca-gate.test.mjs` with `node:test`, and `.github/sca-exceptions.json` as `[]`. Standard library only.
  - **Done when:** `node --test scripts/sca-gate.test.mjs` passes U-SG-1 to U-SG-11.
  - Run on 2026-10-25: `node --test scripts/sca-gate.test.mjs` passes U-SG-1 to U-SG-11 (11 tests); `.github/sca-exceptions.json` starts as `[]`. `--title` names the `--report` that follows it.

- [x] **T04 — Dependabot bump script**
  - **RF:** RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25
  - **Depends on:** — (can run in parallel with T01–T03)
  - **Scope:** `scripts/dependabot-bump.mjs`: pure `nextPatch`, `setVersion` (line edit, D6), `isBumpCommit`, `decide`; side-effect part with `git`/`gh` via `execFileSync` only (no `pnpm`/`npm`, D1): list open `app/dependabot` PRs or `--pr N`, temp clone, drop bump commits, rebase onto `origin/main`, commit, `--force-with-lease`, `Version bump` commit status, conflict comment. `scripts/dependabot-bump.test.mjs`.
  - **Done when:** `node --test scripts/dependabot-bump.test.mjs` passes U-DB-1 to U-DB-12, and `grep -nE "pnpm|npm " scripts/dependabot-bump.mjs` finds no command execution.
  - Run on 2026-10-25: `node --test scripts/dependabot-bump.test.mjs` passes U-DB-1 to U-DB-12 (12 tests; U-DB-10 to U-DB-12 added to the plan to run `rebump` against local bare repos); the script only executes `git` and `gh`.

- [x] **T05 — Run script tests in `test.yaml`**
  - **RF:** RF-16, RF-39, RF-44
  - **Depends on:** T03, T04
  - **Scope:** `test.yaml`: `Script Tests` step (`node --test scripts/`) after `Run Tests`; a `# vX.Y.Z` comment on every pinned action, resolved from the SHA (D9). Triggers, install and other steps unchanged.
  - **Done when:** `node --test scripts/` passes locally (U-SG-_, U-DB-_), and the `Portfolio Tests` run on the branch shows the `Script Tests` step green.
  - Run on 2026-10-25: `node --test scripts/` passes 23 tests locally; pins annotated as `actions/checkout` v7.0.1 and `pnpm/setup` v3.0.0. The `Script Tests` step on GitHub is checked when the branch is pushed (T14).

## Phase 2 — New workflows

- [ ] **T06 — CodeQL advanced setup**
  - **RF:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-08, RF-41
  - **Depends on:** — (can run in parallel with T03–T05)
  - **Scope:** `.github/workflows/codeql.yaml` (PR into `main`, push to `main`, daily `0 7 * * *`, `workflow_dispatch`; matrix `actions` and `javascript-typescript`, `build-mode: none`; minimal permissions; SHA pins with comments) and `.github/codeql/codeql-config.yaml` (`security-extended`, `paths-ignore`). D1, D4.
  - **Done when:** a `workflow_dispatch` run on the branch creates both CodeQL databases without errors (the SARIF upload is only accepted once default setup is off, checked in T14), and the config file lists `security-extended` and the four ignored paths.

- [ ] **T07 — SCA lockfile workflow**
  - **RF:** RF-26, RF-27, RF-28, RF-29, RF-30, RF-41
  - **Depends on:** T03
  - **Scope:** `.github/workflows/sca.yaml`: PR into `main`, daily `30 7 * * *`, `workflow_dispatch`; job `Lockfile Scan` without install (D1): pinned Grype download, `grype file:pnpm-lock.yaml` to JSON and SARIF (D4), `sca-gate.mjs`, `upload-sarif` (`category: sca-lockfile`, `if: always()`, skipped for forks). Permissions `contents: read`, `security-events: write`.
  - **Done when:** a `workflow_dispatch` run on the branch passes and its summary shows the findings table (or "no findings") from `sca-gate.mjs`.

- [ ] **T08 — Dependabot bump workflow**
  - **RF:** RF-18, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-41, RF-42
  - **Depends on:** T02, T04
  - **Scope:** `.github/workflows/dependabot-bump.yaml`: job `request` on `pull_request` (opened, synchronize, reopened) for PRs authored by `dependabot[bot]` and not pushed by the App, `actions: write` only, no checkout, `gh workflow run dependabot-bump.yaml --ref main -f pr=<n>` (D2); job `bump` on `workflow_dispatch`, `push` to `main` (`paths: package.json`) and hourly `schedule`: checkout `main`, `actions/create-github-app-token`, `node scripts/dependabot-bump.mjs` (D3). `concurrency: dependabot-bump`, no cancel.
  - **Done when:** a manual `workflow_dispatch` with no open Dependabot PRs ends green reporting zero PRs, and `grep -n 'secrets\.' .github/workflows/dependabot-bump.yaml` matches only inside the `bump` job.

## Phase 3 — Integration with the existing pipeline

- [ ] **T09 — Scan, publish and SBOM in `release.yaml`**
  - **RF:** RF-16, RF-31, RF-32, RF-33, RF-34, RF-35, RF-40, RF-41, RF-42
  - **Depends on:** T03
  - **Scope:** `package` job: `registry:2` service, Buildx `network=host`, builds pushed to `localhost:5000` (D7); Grype per image and platform with `GRYPE_REGISTRY_INSECURE_USE_HTTP=true`; `sca-gate.mjs` over the four reports before `docker/login-action`; `upload-sarif` per image and platform; `imagetools create` to the three Docker Hub tags; `digest`/`ssr-digest` outputs from `imagetools inspect`; Syft SPDX SBOMs per platform uploaded as `portfolio-<version>-sbom` and `portfolio-ssr-<version>-sbom` (D8); `security-events: write` on this job only; version comments on all pins. `verify` and `deploy` unchanged.
  - **Done when:** in the YAML, `docker/login-action` and `imagetools create` come after the gate step and `deploy` still reads `needs.package.outputs.digest`/`ssr-digest`; E11 passes locally (Grype on an old `node` image + `sca-gate.mjs` exits 1).

- [ ] **T10 — Dependabot config and base-image digests**
  - **RF:** RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17
  - **Depends on:** T01
  - **Scope:** `.github/dependabot.yml` for `npm`, `github-actions`, `docker` (weekly Monday 06:00 `America/Santiago`, `<eco>-minor-patch` groups, literal `build(deps)`/`ci(deps)` prefixes incl. `prefix-development`, labels, no auto-merge; D9, D10, D11 as resolved in T01). `Dockerfile`: every `FROM` pinned as `tag@sha256:…` (D9).
  - **Done when:** the Dependabot "config file" check on the repo's dependency graph shows no errors for `dependabot.yml`, `grep -c '@sha256:' Dockerfile` is 5, and `docker build --target static .` and `docker build --target ssr .` succeed.

- [ ] **T11 — Build-script approval command**
  - **RF:** RF-43, RF-44, RF-45
  - **Depends on:** — (can run in parallel with T03–T10)
  - **Scope:** `package.json` script `"approve-builds": "pnpm approve-builds"` (D12); comment in `pnpm-workspace.yaml` above `allowBuilds`; `AGENTS.md` Commands (`node --test scripts/`, `pnpm run approve-builds`) and closing checklist line for `node --test scripts/`.
  - **Done when:** `pnpm run approve-builds --help` prints pnpm's `approve-builds` usage, `pnpm install --frozen-lockfile` finishes with no build-approval error, and `AGENTS.md` lists both commands.

## Phase 4 — Quality gate and version

- [ ] **T12 — Closing quality gate**
  - **RF:** RF-39, RF-41, RF-42
  - **Depends on:** T05–T11
  - **Scope:** Run the `AGENTS.md` checklist and the E14 review over every workflow.
  - **Done when:** `pnpm test --watch=false`, `pnpm build` (no exceeded budgets), `scripts/check-ssr-csp.sh` and `node --test scripts/` pass; `pnpm exec prettier --check .` is clean; E14 holds (every workflow has `permissions`, every third-party action is SHA-pinned, no `secrets.` in a job reachable from a Dependabot `pull_request` run).

- [ ] **T13 — Bump version to 4.5.0**
  - **RF:** —
  - **Depends on:** T12
  - **Scope:** `version` in `package.json` → `4.5.0` (feat → minor).
  - **Done when:** `jq -r .version package.json` prints `4.5.0` in a commit `chore(release): Bump version to v4.5.0`.

## Phase 5 — Rollout and end-to-end checks

- [ ] **T14 — Open the PR and switch CodeQL to advanced setup**
  - **RF:** RF-02, RF-05, RF-09, RF-26
  - **Depends on:** T13
  - **Scope:** Open the PR into `main` (`/create-pr`); disable CodeQL default setup (`gh api -X PATCH repos/mfigueroa23/portfolio/code-scanning/default-setup -f state=not-configured`); re-run the PR checks.
  - **Done when:** `gh api repos/mfigueroa23/portfolio/code-scanning/default-setup --jq .state` prints `not-configured`, and the PR shows `Unit Tests`, `Lockfile Scan`, `Analyze (actions)` and `Analyze (javascript-typescript)` green.

- [ ] **T15 — Ruleset on `main`**
  - **RF:** RF-06, RF-07, RF-28
  - **Depends on:** T14
  - **Scope:** Ruleset on `main` requiring the four checks by the names shown in T14, plus the code scanning rule for CodeQL (security alerts `high_or_higher`, alerts `none`; D4).
  - **Done when:** `gh api repos/mfigueroa23/portfolio/rulesets` lists the ruleset with the four required checks and the `code_scanning` rule.

- [ ] **T16 — Throwaway-branch checks**
  - **RF:** RF-06, RF-07, RF-08, RF-28, RF-29, RF-30, RF-36, RF-37, RF-38, RF-44, RF-45
  - **Depends on:** T15
  - **Scope:** PRs from throwaway branches off the feature branch, closed without merging: vulnerable `innerHTML` sink, medium-only alert, vulnerable dependency pin with valid/expired/incomplete exceptions, package with an unapproved `postinstall`.
  - **Done when:** E1, E2, E3, E4 and E12 pass as described in the plan, and every throwaway PR and branch is closed and deleted.

- [ ] **T17 — Merge and verify the release**
  - **RF:** RF-31, RF-33, RF-34, RF-35, RF-40, RF-44
  - **Depends on:** T16
  - **Scope:** Merge the PR; watch `Portfolio Release`. On a failure in the new steps, revert the merge.
  - **Done when:** E10 passes: both images scanned on both platforms, the Docker Hub digests equal the ones `deploy` pinned, `rollout status` succeeds, nginx answers `/healthz`, and the run has the artifacts `portfolio-4.5.0-sbom` and `portfolio-ssr-4.5.0-sbom`.

- [ ] **T18 — Dependabot and bump end to end**
  - **RF:** RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-39
  - **Depends on:** T17
  - **Scope:** "Check for updates" for each ecosystem in the dependency graph; observe the PRs and the bump runs; merge one, recreate one, force a conflict on one; check a feature-branch PR.
  - **Done when:** E5, E6, E7, E8 and E9 pass as described in the plan.

- [ ] **T19 — Scheduled runs and release tag**
  - **RF:** RF-04, RF-09, RF-27
  - **Depends on:** T17
  - **Scope:** The day after merging, check the scheduled runs; then tag the release.
  - **Done when:** E13 passes (scheduled `CodeQL` and `SCA` runs on `main`, no default-setup CodeQL run), and `/tag-release` has published `4.5.0`.

## RF → tasks

| RF           | Tasks              |
| ------------ | ------------------ |
| RF-01        | T06                |
| RF-02        | T06, T14           |
| RF-03        | T06                |
| RF-04        | T06, T19           |
| RF-05        | T06, T14           |
| RF-06, RF-07 | T15, T16           |
| RF-08        | T06, T16           |
| RF-09        | T14, T19           |
| RF-10        | T10, T18           |
| RF-11, RF-12 | T10, T18           |
| RF-13        | T01, T10, T18      |
| RF-14        | T10, T18           |
| RF-15        | T02, T10, T18      |
| RF-16        | T05, T09, T10, T18 |
| RF-17        | T10, T18           |
| RF-18        | T02, T04, T08, T18 |
| RF-19        | T04, T18           |
| RF-20–RF-25  | T04, T08, T18      |
| RF-26        | T07, T14           |
| RF-27        | T07, T19           |
| RF-28        | T03, T07, T15, T16 |
| RF-29, RF-30 | T03, T07, T16      |
| RF-31        | T09, T17           |
| RF-32        | T09                |
| RF-33        | T03, T09, T17      |
| RF-34, RF-35 | T09, T17           |
| RF-36–RF-38  | T03, T16           |
| RF-39        | T05, T12, T18      |
| RF-40        | T09, T17           |
| RF-41        | T06–T09, T12       |
| RF-42        | T08, T09, T12      |
| RF-43        | T11                |
| RF-44        | T05, T11, T16, T17 |
| RF-45        | T11, T16           |
