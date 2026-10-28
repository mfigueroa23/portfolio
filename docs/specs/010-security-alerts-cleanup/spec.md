# Spec 010 — Security alerts cleanup

- **Status:** Approved
- **Date:** 2026-10-28
- **Scope:** `web` repository: `pnpm-lock.yaml`, `.github/sca-exceptions.json` and the repository's Code Scanning alerts; no change to the site's runtime behaviour, images or CI workflows

## Why

The pipeline introduced by Spec 009 left 17 open alerts in Code Scanning after the 4.5.5 release.
Twelve report CVE-2025-60876 (BusyBox `wget` request-line injection) in the `busybox`,
`busybox-binsh` and `ssl_client` packages of the `portfolio` and `portfolio-ssr` images, on amd64
and arm64. Alpine has no fixed package in any branch, edge included. Four report advisories in
`fast-uri` 3.1.8, a transitive dependency of the Angular CLI tooling in `pnpm-lock.yaml`, which
3.1.9 fixes. One CodeQL alert (`js/http-to-file-access`) flags the build-time script that saves
the server-rendered pages for CSP hashing.

None of them blocks a merge or a release today: all are medium or low. But the open list hides any
new alert among known ones, and the owner has no record of why each finding is accepted or when it
must be reviewed again. The goal is an empty list of open alerts: fixed where a fix exists, and
dismissed with a documented, expiring justification where it does not.

## Decisions

| Topic                                     | Decision                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| BusyBox CVE-2025-60876 (12 alerts)        | Stay on Alpine. The images keep their current bases, because no Alpine branch ships a fix.                                                       |
| Alternative bases                         | Chainguard/Wolfi, Debian slim and distroless were discarded by the owner.                                                                        |
| How BusyBox is accepted                   | Both: dismissed as "won't fix" in Code Scanning with the reason, and recorded in `.github/sca-exceptions.json` with a reason and an expiry date. |
| Exception expiry                          | 90 days from the spec date (2027-01-26) (default, not asked).                                                                                    |
| Exception granularity                     | One entry by CVE id, which covers the 3 packages on both images and architectures (default, not asked; the gate matches by advisory id).         |
| `fast-uri` (4 alerts)                     | Refresh the lockfile so `fast-uri` resolves to ≥ 3.1.9 inside `ajv`'s existing range; no override.                                               |
| CodeQL `js/http-to-file-access` (1 alert) | Dismissed as "false positive" with the reason; no code change and `docker/` stays analysed.                                                      |
| Branch                                    | `feature/security-alerts`.                                                                                                                       |

## Functional requirements

"The system" is the `web` repository with its Spec 009 pipeline (SCA lockfile scan, release image
scan, CodeQL). "Owner" is the repository owner. "Open alert" is a Code Scanning alert in state
`open`.

### Lockfile dependency fix

- **RF-01** — The lockfile shall resolve every `fast-uri` instance to version 3.1.9 or later.
- **RF-02** — The fix of RF-01 shall leave `dependencies`, `devDependencies` and `overrides` unchanged in `package.json` and `pnpm-workspace.yaml`.
- **RF-03** — When the SCA lockfile scan runs on the PR of this spec, it shall report no finding for GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp or GHSA-xhq7-xmqj-769h.
- **RF-04** — When the SCA lockfile scan runs on `main` after the merge, Code Scanning shall mark alerts 3, 4, 5 and 6 as `fixed`.

### Accepted image findings

- **RF-05** — `.github/sca-exceptions.json` shall contain one entry for `CVE-2025-60876`. Its reason shall state that Alpine ships no fix and that `wget` is used only by the `HEALTHCHECK` with a fixed localhost URL. It shall expire on 2027-01-26.
- **RF-06** — When the release image scan runs with the entry of RF-05, the SCA gate shall classify every CVE-2025-60876 match as `excepted`, and the release shall continue to publish.
- **RF-07** — If the entry of RF-05 has expired, then the SCA gate shall report CVE-2025-60876 as `reported` again without blocking the release, because the finding is medium and has no fix.
- **RF-08** — The 12 CVE-2025-60876 alerts (18–20, 22–30, categories `sca-image-static-amd64`, `sca-image-static-arm64`, `sca-image-ssr-amd64`, `sca-image-ssr-arm64`) shall be in state `dismissed` with reason "won't fix" and a comment that matches the reason of RF-05 and its expiry date.

### CodeQL false positive

- **RF-09** — CodeQL alert 16 (`js/http-to-file-access`, `docker/render-ssr-pages.mjs`) shall be in state `dismissed` with reason "false positive". The comment shall state that the script fetches fixed routes from the SSR server it starts on localhost, at build time, and writes them to fixed file names.
- **RF-10** — The CodeQL configuration shall keep analysing `docker/`: its `paths-ignore` stays unchanged.

### Integration with the existing pipeline

- **RF-11** — When this spec is complete, the repository shall have zero open Code Scanning alerts.

## Out of scope

- Changing the base images to Chainguard/Wolfi, Debian slim or distroless (discarded by the owner).
- Removing `wget` or BusyBox from the Alpine images, or changing the `HEALTHCHECK`.
- Filtering unfixed findings out of the SARIF uploads (`--only-fixed`): it would contradict the Spec 009 decision that findings without a fix are reported.
- Hardening `docker/render-ssr-pages.mjs` or excluding `docker/` from CodeQL (discarded in favour of the false-positive dismissal).
- A `fast-uri` override in `pnpm-workspace.yaml` (discarded in favour of the lockfile refresh).
- Alerts of the `api` and `panel` repositories, and new alerts that appear after the spec date (those get their own triage).
- Any change to the site's code, routes, CSP or runtime behaviour.

## Constraints

- **Dependency approval (AGENTS.md):** RF-01 changes `pnpm-lock.yaml`; the owner approved the lockfile refresh for `fast-uri` when answering this spec, and the plan must confirm that no other package changes version.
- **`.github/` change:** RF-05 edits `.github/sca-exceptions.json`, the exceptions file of Spec 009; approval pending in the plan.
- **Repository actions (manual or `gh api`, owner):** the dismissals of RF-08 and RF-09 are outward-facing changes on GitHub, made with the owner's confirmation.
- Constitution §9: SemVer and Conventional Commits; `test.yaml` keeps gating `main`.
- Constitution §10: `release.yaml` keeps publishing `portfolio` and `portfolio-ssr` pinned by digest.

## Done criteria

- [ ] `pnpm why fast-uri` shows only versions ≥ 3.1.9, and the lockfile diff touches only `fast-uri`.
- [ ] The SCA lockfile check on the PR passes and reports no `fast-uri` finding.
- [ ] `node --test scripts/` passes, and `node scripts/sca-gate.mjs` accepts the new exceptions file (no invalid entry).
- [ ] `pnpm test --watch=false`, `pnpm build` and `scripts/check-ssr-csp.sh` pass; `pnpm exec prettier --check` is clean on the touched files.
- [ ] After the merge, the release run shows CVE-2025-60876 as `excepted` in its summary and still publishes, pins by digest and passes `rollout status`.
- [ ] `gh api 'repos/mfigueroa23/portfolio/code-scanning/alerts?state=open'` returns an empty list.
- [ ] `version` in `package.json` bumped as a patch (v4.5.6) in `chore(release): Bump version to v4.5.6`.
