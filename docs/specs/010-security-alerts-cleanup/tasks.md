# Tasks 010 — Security alerts cleanup

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Order:** by dependency. A task starts only when the tasks under "Depends on" are done. Tasks with the same dependencies can run in parallel.
- **Ids:** `D#` = plan decision, `U-*` / `E#` = tests listed in the plan's test strategy.

The owner approved the spec, the plan, the dismissal comments C1 and C2 and the `gh api` dismissals
(D4) on 2026-10-28, so there is no gate phase. T09 still asks for confirmation right before it
changes GitHub's state, because that change is outward-facing.

## Phase 1 — Branch changes

- [x] **T01 — Commit the spec, plan and tasks**
  - **RF:** —
  - **Depends on:** —
  - **Scope:** On `feature/security-alerts`, commit `docs/specs/010-security-alerts-cleanup/` (`spec.md` and `plan.md` as Approved, `tasks.md`) as `docs(specs): Add spec and plan 010` (D8).
  - **Done when:** `git log -1 --format=%s` prints `docs(specs): Add spec and plan 010`, and `git status --short` is empty.

- [ ] **T02 — Refresh `fast-uri` in the lockfile**
  - **RF:** RF-01, RF-02
  - **Depends on:** T01
  - **Scope:** `pnpm update fast-uri --lockfile-only`, then `pnpm install --frozen-lockfile` (D1). No override and no change to `package.json` or `pnpm-workspace.yaml`. Commit `build(deps): Bump fast-uri to 3.1.9` (D8).
  - **Done when:** E1 (lockfile part):
    - `pnpm why fast-uri` shows only 3.1.9;
    - `git diff main -- pnpm-lock.yaml` touches only `fast-uri` lines (3 hunks);
    - `git diff main -- package.json pnpm-workspace.yaml` is empty.

- [ ] **T03 — Accept CVE-2025-60876 in the exceptions file**
  - **RF:** RF-05, RF-06, RF-07
  - **Depends on:** T01 (can run in parallel with T02)
  - **Scope:** Add to `.github/sca-exceptions.json` one entry `{ "id": "CVE-2025-60876", "reason": …, "expires": "2027-01-26" }`, with the reason of the plan's `sca-exceptions.json` row (D2). `scripts/` stays unchanged (D3). E3 uses a minimal Grype JSON fixture in the scratchpad, not in the repo. Commit `ci(sca): Accept CVE-2025-60876 until 2027-01-26` (D8).
  - **Done when:**
    - E3 today: the `busybox` match is `excepted` and the exit code is 0.
    - E3 with `SCA_GATE_TODAY=2027-01-27`: it is `reported`, _Expired exceptions_ names the entry and the exit code is 0.
    - E3 with an `--exceptions` copy that has no `reason`: the exit code is 1.
    - `node --test scripts/` passes, U-SG-5 to U-SG-9 included.

## Phase 2 — Quality gate and version

- [ ] **T04 — Quality gate**
  - **RF:** RF-10
  - **Depends on:** T02, T03
  - **Scope:** Run the closing checklist of `AGENTS.md` on the branch.
  - **Done when:**
    - `pnpm test --watch=false`, `pnpm build` (no exceeded budgets), `scripts/check-ssr-csp.sh` and `node --test scripts/` pass.
    - `pnpm exec prettier --check docs/specs/010-security-alerts-cleanup .github/sca-exceptions.json` is clean.
    - E7: `git diff main -- .github/codeql` is empty.

- [ ] **T05 — Bump the version to 4.5.6**
  - **RF:** RF-02
  - **Depends on:** T04
  - **Scope:** `version` 4.5.5 → 4.5.6 in `package.json`, committed as `chore(release): Bump version to v4.5.6` (D7, D8).
  - **Done when:** E1 (`package.json` part): `git diff main -- package.json` changes only the `version` line, and `git log -1 --format=%s` prints `chore(release): Bump version to v4.5.6`.

- [ ] **T06 — Open the pull request**
  - **RF:** RF-03, RF-05
  - **Depends on:** T05
  - **Scope:** `/create-pr` from `feature/security-alerts` into `main`, with the 4 commits of D8.
  - **Done when:** E2:
    - the PR's `SCA` → `Lockfile Scan` check passes;
    - its summary has no `fast-uri` advisory and no _Invalid exceptions_ section;
    - `CodeQL` and `Portfolio Tests` pass.

## Phase 3 — Rollout and end-to-end checks

- [ ] **T07 — Merge and watch the release**
  - **RF:** RF-06
  - **Depends on:** T06
  - **Scope:** Merge the PR. `release.yaml` builds, scans and publishes 4.5.6 (**Release** step 1).
  - **Done when:** E4:
    - the `Check Findings` summary lists every CVE-2025-60876 row as `excepted` on the 4 images;
    - `portfolio` and `portfolio-ssr` are published and pinned by digest;
    - `rollout status` passes.

- [ ] **T08 — Close the `fast-uri` alerts on `main`**
  - **RF:** RF-04
  - **Depends on:** T07
  - **Scope:** `gh workflow run sca.yaml --ref main` (D6) and wait for the run.
  - **Done when:** E5: alerts 3, 4, 5 and 6 report `state: fixed`.

- [ ] **T09 — Dismiss the BusyBox and CodeQL alerts**
  - **RF:** RF-08, RF-09
  - **Depends on:** T07 (can run in parallel with T08)
  - **Scope:** After the owner confirms at run time, run `gh api -X PATCH …/code-scanning/alerts/{n}` (D4, D5):
    - for 18–20 and 22–30: `state=dismissed`, `dismissed_reason=won't fix` and comment C1;
    - for 16: `dismissed_reason=false positive` and comment C2;
    - in the same pass, any CVE-2025-60876 alert the release opened under a new number.
  - **Done when:** E6: `gh api` on each of those alerts returns `dismissed` with the expected reason and comment.

- [ ] **T10 — Zero open alerts and tag the release**
  - **RF:** RF-10, RF-11
  - **Depends on:** T08, T09
  - **Scope:** Final check, then `/tag-release` 4.5.6 (**Release** steps 4 and 5).
  - **Done when:**
    - E8: `gh api 'repos/mfigueroa23/portfolio/code-scanning/alerts?state=open'` returns `[]`;
    - E7: still empty on `main`;
    - `gh release view 4.5.6` shows the published release.

- [ ] **T11 — Review the exception before it expires**
  - **RF:** RF-05, RF-07
  - **Depends on:** T10
  - **Scope:** Before 2027-01-26, check CVE-2025-60876 in Alpine's security tracker (**Release** step 6). If a fix shipped, remove the entry; the `apk upgrade` in the final stages picks the fix up. Otherwise extend `expires`, with a patch bump in its own PR.
  - **Done when:** on or before 2027-01-26, `.github/sca-exceptions.json` on `main` either has no `CVE-2025-60876` entry or has one with a later `expires`.

## RF → tasks

| RF    | Tasks         |
| ----- | ------------- |
| RF-01 | T02           |
| RF-02 | T02, T05      |
| RF-03 | T06           |
| RF-04 | T08           |
| RF-05 | T03, T06, T11 |
| RF-06 | T03, T07      |
| RF-07 | T03, T11      |
| RF-08 | T09           |
| RF-09 | T09           |
| RF-10 | T04, T10      |
| RF-11 | T10           |
