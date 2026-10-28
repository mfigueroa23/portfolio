# Plan 010 — Security alerts cleanup

- **Spec:** [spec.md](spec.md) (approved 2026-10-28)
- **Status:** Approved
- **Version:** 4.5.6 (fix → patch)

The plan changes only data files: one transitive package in `pnpm-lock.yaml` and one entry in
`.github/sca-exceptions.json`. The rest happens in GitHub's Code Scanning. The site's code, routes,
CSP, budgets, images and workflows do not change (constitution §2, §3, §10), and `test.yaml` keeps
gating `main` (§9). Neither `package.json` nor `pnpm-workspace.yaml` changes (§1).

The owner approved the `fast-uri` lockfile refresh while answering the spec. A dry run on a copy of
the lockfile confirmed that only `fast-uri` moves (D1). The edit of `.github/sca-exceptions.json`
was approved with the spec on 2026-10-28. Still pending: the owner's confirmation for the 13
dismissals on GitHub (D4, **Release**).

## Modules

### Changed: `pnpm-lock.yaml`

| File             | Change                                                                                                                                                                                                                                                                     | RF           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `pnpm-lock.yaml` | `pnpm update fast-uri --lockfile-only`: `fast-uri@3.1.8` → `3.1.9` in `packages`, `snapshots` and the `ajv@8.20.0` snapshot (3 hunks, new integrity). No other package changes; `package.json` and `pnpm-workspace.yaml` (including the `vite` override) stay as they are. | RF-01, RF-02 |

### Changed: `.github/sca-exceptions.json`

| File                  | Change                                                                                                                                                                                                                                                                                                              | RF          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `sca-exceptions.json` | From `[]` to one entry, using the shape `scripts/sca-gate.mjs` validates (`validateExceptions`): `{ "id": "CVE-2025-60876", "reason": "…", "expires": "2027-01-26" }`. The reason says that Alpine ships no fixed busybox in any branch and that `wget` runs only in the `HEALTHCHECK`, with a fixed localhost URL. | RF-05–RF-07 |

### Code Scanning (repository state, no file)

| Alerts                                                                                                         | Change                                                                                                       | RF    |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30 (Grype, CVE-2025-60876; `sca-image-{static,ssr}-{amd64,arm64}`) | `PATCH …/code-scanning/alerts/{n}` with `state=dismissed`, `dismissed_reason=won't fix` and comment C1 (D4). | RF-08 |
| 16 (CodeQL, `js/http-to-file-access`, `docker/render-ssr-pages.mjs`)                                           | `PATCH …/code-scanning/alerts/16` with `state=dismissed`, `dismissed_reason=false positive` and comment C2.  | RF-09 |
| 3, 4, 5, 6 (Grype, `fast-uri`, `sca-lockfile`)                                                                 | No manual action: the SCA scan on `main` closes them as `fixed` once the merge lands (D6).                   | RF-04 |

The comments, which stay under GitHub's 280-character limit:

- **C1:** `Alpine ships no fixed busybox for CVE-2025-60876 in any branch (edge included). wget runs only in the HEALTHCHECK against a fixed localhost URL; no untrusted input reaches it. Accepted in .github/sca-exceptions.json until 2027-01-26 (Spec 010).`
- **C2:** `Build-time script (Dockerfile stage ssr-pages): it fetches 4 fixed routes from the SSR server it starts on localhost and writes them to fixed file names for CSP hashing. No external input picks the URL, the path or the file name (Spec 010).`

### Unchanged on purpose

| File                                                               | Why                                                                                                          | RF           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------ |
| `.github/codeql/codeql-config.yaml`                                | `paths-ignore` keeps `dist`, `node_modules`, `.angular` and `coverage` only, so `docker/` is still analysed. | RF-10        |
| `scripts/sca-gate.mjs`, `scripts/sca-gate.test.mjs`                | The gate already classifies, expires and validates exceptions (D3).                                          | RF-06, RF-07 |
| `Dockerfile`, `docker/render-ssr-pages.mjs`, `.github/workflows/*` | Out of scope in the spec.                                                                                    | —            |

### Infrastructure

| File           | Change                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| `package.json` | `version` 4.5.5 → 4.5.6 in `chore(release): Bump version to v4.5.6` (D7). |

## Data model

None: no schema or migration.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                         | Discarded alternative                                                                | Why                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Refresh `fast-uri` with `pnpm update fast-uri --lockfile-only`. A dry run on a copy of the repo's files gave a 3-hunk diff (only `fast-uri`) and left `package.json` and `pnpm-workspace.yaml` unchanged.                                                                                                        | `overrides: fast-uri: 3.1.9`, or a full `pnpm update`                                | The spec rules out the override. A full update would move unrelated packages, and RF-02 and the done criteria ask for a lockfile diff that touches only `fast-uri`. 3.1.9 fits `ajv`'s `^3.0.1`.                                                           |
| D2  | One exception entry keyed `CVE-2025-60876`.                                                                                                                                                                                                                                                                      | One entry per package (`busybox`, `busybox-binsh`, `ssl_client`) or per image        | `classify()` matches on `vulnerability.id` and the related ids, not on the package. Grype reports all 12 matches as `CVE-2025-60876` (namespace `nvd:cpe`), so one entry covers them all with a single expiry to review (spec Decisions).                  |
| D3  | No change to `sca-gate.mjs` or its tests. RF-06 and RF-07 rely on the existing U-SG-5 (an exception makes a finding `excepted`) and U-SG-7 (expiry is inclusive of its day). The validity of the real file is checked by E3 and by the PR's own `SCA` check, which loads the file and fails on an invalid entry. | A new test that reads the real `.github/sca-exceptions.json`                         | That test would add a `scripts/` change (it needs infra approval) to duplicate a check the PR already runs. The behaviour it would test is covered by U-SG-5 to U-SG-9.                                                                                    |
| D4  | Dismiss the 13 alerts with `gh api -X PATCH`, using the fixed comments C1 and C2, after the owner confirms.                                                                                                                                                                                                      | Dismissing each alert by hand from the Security tab                                  | Thirteen identical dismissals by hand risk inconsistent reasons and comments (RF-08 asks every comment to match the exception). A command is repeatable and leaves the same text everywhere.                                                               |
| D5  | Dismiss after the merge and the release run, not on the branch.                                                                                                                                                                                                                                                  | Dismissing right away, before the PR                                                 | The release run re-uploads the four image SARIFs. Dismissing afterwards confirms on the same alerts that the gate reports `excepted` (RF-06) and catches any alert that appears under a new number in the same pass, so RF-11 is checked once, at the end. |
| D6  | After the merge, dispatch `sca.yaml` on `main` (`gh workflow run sca.yaml --ref main`) to close alerts 3–6.                                                                                                                                                                                                      | Waiting for the daily schedule (07:30 UTC), or adding a `push` trigger to `sca.yaml` | `sca.yaml` has no `push` trigger, so `main`'s alerts update only on the schedule or on a dispatch. Changing the workflow is out of scope in the spec. The dispatch verifies RF-04 the same day.                                                            |
| D7  | Patch bump to 4.5.6.                                                                                                                                                                                                                                                                                             | Minor                                                                                | No new behaviour: a dependency fix and the triage of findings (AGENTS.md: fix → patch).                                                                                                                                                                    |
| D8  | Four commits: `docs(specs): Add spec and plan 010`, `build(deps): Bump fast-uri to 3.1.9`, `ci(sca): Accept CVE-2025-60876 until 2027-01-26`, `chore(release): Bump version to v4.5.6`.                                                                                                                          | One commit for everything                                                            | Each part can be reverted on its own. This follows Spec 009's `build(deps)` and `ci(...)` prefixes (`6a57e35`, `fe08bf1`).                                                                                                                                 |

## RF coverage

| RF           | Where                                           | Tests                  |
| ------------ | ----------------------------------------------- | ---------------------- |
| RF-01        | `pnpm-lock.yaml` (D1)                           | E1                     |
| RF-02        | `package.json`, `pnpm-workspace.yaml` unchanged | E1                     |
| RF-03        | PR `SCA` check over the new lockfile            | E2                     |
| RF-04        | `sca.yaml` dispatch on `main` (D6)              | E5                     |
| RF-05        | `.github/sca-exceptions.json` (D2)              | E2, E3                 |
| RF-06, RF-07 | `scripts/sca-gate.mjs` (unchanged, D3)          | U-SG-5, U-SG-7, E3, E4 |
| RF-08, RF-09 | Code Scanning dismissals (D4, D5)               | E6                     |
| RF-10        | `.github/codeql/codeql-config.yaml` unchanged   | E7                     |
| RF-11        | Every step above                                | E8                     |

## Test strategy

No new unit tests (D3). The existing `node --test scripts/` suite must still pass, in particular:

- **U-SG-5:** a valid exception makes the matching finding `excepted`.
- **U-SG-7:** an entry is valid through its expiry day and expired the day after.

Checks, local and in CI:

- **E1 (local):** `pnpm why fast-uri` shows only 3.1.9. `git diff main -- package.json pnpm-workspace.yaml` is empty before the version bump. After the bump, the `package.json` diff is only the `version` line. `git diff main -- pnpm-lock.yaml` touches only `fast-uri` lines.
- **E2 (PR):** the `SCA` → `Lockfile Scan` check passes. Its summary lists no `fast-uri` advisory and no _Invalid exceptions_ section. The `CodeQL` and `Portfolio Tests` checks pass.
- **E3 (local, fixture in the scratchpad):** a minimal Grype JSON with one `busybox` match `CVE-2025-60876` (Medium, `fix.state: not-fixed`) is run through `node scripts/sca-gate.mjs --report <fixture>` against the real exceptions file.
  - Today: the match is `excepted` and the exit code is 0.
  - With `SCA_GATE_TODAY=2027-01-27`: it is `reported`, _Expired exceptions_ names the entry and the exit code is still 0.
  - An override copy without `reason`, passed as `--exceptions`: the gate exits 1.
- **E4 (release, after the merge):** the `Check Findings` summary shows every CVE-2025-60876 row as `excepted` on the four images. Both images are published, pinned by digest, and `rollout status` passes.
- **E5 (after the merge):** once `sca.yaml` has run on `main`, alerts 3, 4, 5 and 6 are `fixed`.
- **E6 (after E4):** `gh api …/code-scanning/alerts/{n}` returns `dismissed` with the reason and comment of D4:
  - for 18–20 and 22–30, `won't fix` and C1;
  - for 16, `false positive` and C2.
- **E7:** `git diff main -- .github/codeql` is empty.
- **E8:** `gh api 'repos/mfigueroa23/portfolio/code-scanning/alerts?state=open'` returns `[]`.

Not covered automatically: E4 to E8 depend on GitHub's Code Scanning state and on the production
release. They are checked by hand in **Release**.

## Implementation order

1. Commit the spec and this plan on `feature/security-alerts` (D8).
2. `pnpm update fast-uri --lockfile-only` and `pnpm install --frozen-lockfile`, then E1. Commit `build(deps)`.
3. Add the `CVE-2025-60876` entry to `.github/sca-exceptions.json`, then E3. Commit `ci(sca)`.
4. Bump `version` to 4.5.6 and commit `chore(release): Bump version to v4.5.6`.
5. Run `pnpm test --watch=false`, `pnpm build`, `scripts/check-ssr-csp.sh` and `node --test scripts/`, plus `pnpm exec prettier --check` on the touched files.
6. `/create-pr`, then E2.

## Release

1. Merge the PR once E2 passes. `release.yaml` builds, scans and publishes 4.5.6 (E4).
2. Run `gh workflow run sca.yaml --ref main`, then E5.
3. With the owner's confirmation, dismiss the 13 alerts with the D4 command, then E6. If the release opened CVE-2025-60876 alerts under new numbers, dismiss them in the same pass.
4. E7 and E8: zero open alerts.
5. `/tag-release` 4.5.6.
6. Before 2027-01-26, review CVE-2025-60876 in Alpine's tracker. Remove the exception if a fix shipped (the `apk upgrade` already in the final stages picks it up), or extend it with a new expiry.

## Risks

- **New alert fingerprints:** a Grype upgrade that changes the location format (`portfolio//lib/apk/db/installed`) would open the BusyBox findings again as new alerts, without blocking (medium, no fix). Mitigation: the exception keeps the gate summary at `excepted`, and step 3 of **Release** handles any new number.
- **Silent expiry:** after 2027-01-26 the gate only lists the entry under _Expired exceptions_ and does not block. Mitigation: step 6 of **Release**, plus a calendar reminder for the owner.
- **Lockfile conflicts:** a Dependabot PR that touches `pnpm-lock.yaml` before this merge would conflict. Mitigation: rebase onto `main` and repeat step 2 (D1). The command is idempotent.
- **Supply-chain policy:** pnpm 12 checks the lockfile against its policies on install. The dry run with `fast-uri` 3.1.9 passed. If the policy later rejects it, the install fails in CI before any merge.
- **Outward-facing dismissals:** they change the repository's security record and cannot be undone silently (reopening is visible). Mitigation: D4 runs only with the owner's confirmation, and the comments point to this spec.
