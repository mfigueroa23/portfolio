# Spec 009 — DevSecOps: CodeQL, Dependabot and SCA

- **Status:** Approved
- **Date:** 2026-10-25
- **Scope:** `web` repository CI only (GitHub Actions, Dependabot, repository security settings); no change to the site's runtime behaviour

## Why

Static analysis and dependency updates are currently driven by GitHub's defaults: CodeQL runs in
default setup once a week with the `default` query suite and never gates a pull request, and
Dependabot only opens security-update PRs configured from the repository settings, so the project
has no versioned control over what is analysed, how often, or what blocks a merge. Every merge into
`main` deploys to production through `release.yaml`, so a vulnerable dependency or base image can
reach the cluster without any check stopping it.

Dependabot PRs also break the repository's delivery rule (constitution §9 and the closing checklist
of `AGENTS.md`): each change into `main` must bump `version` in `package.json`, but those PRs never
do, so the owner has to add the bump by hand before merging. Finally, there is no software
composition analysis of the lockfile or of the published `portfolio` and `portfolio-ssr` images, and
no inventory (SBOM) of what each published image contains.

## Decisions

| Topic                    | Decision                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CodeQL setup             | Versioned advanced setup replaces the default setup; languages stay `actions` and `javascript-typescript`.                                                                                                                     |
| CodeQL queries           | `security-extended` suite.                                                                                                                                                                                                     |
| CodeQL triggers          | Every PR into `main`, every push to `main` and a **daily** scheduled scan (instead of weekly).                                                                                                                                 |
| CodeQL gating            | A new alert of high or critical security severity fails the check and blocks the merge.                                                                                                                                        |
| Dependabot ecosystems    | npm (pnpm), GitHub Actions and Docker base images.                                                                                                                                                                             |
| Docker security updates  | Not available (GitHub has no advisories for container images); base images are covered by weekly digest updates and the release image scan. Approved by the owner on 2026-10-25.                                               |
| Dependabot updates       | Weekly version updates; minor and patch grouped in one PR per ecosystem, each major in its own PR; security updates keep opening immediately.                                                                                  |
| Version bump             | Every Dependabot PR carries `chore(release): Bump version to vX.Y.Z` with a **patch** bump over `main`'s version, whatever the kind of update (npm, Actions, Docker; patch, minor or major).                                   |
| Stale bumps              | The bump is recomputed whenever `main`'s version changes while the PR is open (default, not asked).                                                                                                                            |
| Auto-merge               | None: every Dependabot PR waits for the owner's review, because each merge deploys.                                                                                                                                            |
| SCA scope                | Vulnerabilities of `pnpm-lock.yaml` on every PR into `main` and daily; vulnerabilities of the `static` and `ssr` images in the release before they are published; an SBOM of each published image.                             |
| SCA gating               | Critical or high findings **with a fixed version** block; findings without a fix are reported only.                                                                                                                            |
| Exceptions               | A versioned exceptions file; each entry needs the finding id, a reason and an expiry date (default, not asked for format).                                                                                                     |
| Reporting                | CodeQL and SCA findings appear in the repository's Security tab (code scanning) and in the job summary (default, not asked).                                                                                                   |
| Dependency build scripts | One project command approves the build scripts in `pnpm-workspace.yaml` (`allowBuilds`), so installs in CI (`release.yaml` included) do not fail; a new, unapproved build script still fails the install (default, not asked). |
| This spec's version      | Minor bump (new CI capability), per the closing checklist.                                                                                                                                                                     |

## Functional requirements

"The pipeline" is the set of GitHub Actions workflows and the Dependabot configuration versioned in
this repository. "Owner" is the repository owner. "Dependabot PR" is a pull request opened by
Dependabot against `main`. "Blocking finding" is a vulnerability of critical or high severity that
has a fixed version and is not covered by a valid exception. "Images" are the `static`
(`portfolio`) and `ssr` (`portfolio-ssr`) targets of the `Dockerfile`.

### SAST (CodeQL)

- **RF-01** — The pipeline shall analyse the repository with CodeQL for the `actions` and `javascript-typescript` languages using the `security-extended` query suite.
- **RF-02** — When a pull request into `main` is opened or updated, the pipeline shall run the CodeQL analysis and report it as a check on the PR.
- **RF-03** — When a commit is pushed to `main`, the pipeline shall run the CodeQL analysis.
- **RF-04** — The pipeline shall run the CodeQL analysis on `main` once a day on a schedule.
- **RF-05** — When a CodeQL analysis finishes, the pipeline shall publish its alerts in the repository's code scanning (Security tab).
- **RF-06** — If a pull request introduces a CodeQL alert of high or critical security severity, then the CodeQL check shall fail and the PR shall not be mergeable.
- **RF-07** — If a pull request introduces only alerts below high severity, then the CodeQL check shall pass and the alerts shall still be published.
- **RF-08** — The pipeline shall exclude build output and installed dependencies (`dist/`, `node_modules/`) from the CodeQL analysis.
- **RF-09** — While the advanced CodeQL setup is active, the repository shall not run the CodeQL default setup.

### Dependency updates (Dependabot)

- **RF-10** — The pipeline shall check npm, GitHub Actions and `Dockerfile` base-image dependencies for version updates once a week.
- **RF-11** — The pipeline shall group the minor and patch version updates of each ecosystem into a single Dependabot PR.
- **RF-12** — The pipeline shall open each major version update in its own Dependabot PR.
- **RF-13** — When a security advisory affects an npm or GitHub Actions dependency, the pipeline shall open a security-update Dependabot PR without waiting for the weekly check. Docker base images are covered by RF-10 and RF-31 to RF-33 instead.
- **RF-14** — The pipeline shall title Dependabot commits and PRs with Conventional Commits: `build(deps)` for npm and Docker, `ci(deps)` for GitHub Actions.
- **RF-15** — The pipeline shall label every Dependabot PR with `dependencies` and its ecosystem.
- **RF-16** — The pipeline shall keep GitHub Actions pinned by full commit SHA when it updates them.
- **RF-17** — The pipeline shall not merge any Dependabot PR automatically.

### Version bump in Dependabot PRs

- **RF-18** — When a Dependabot PR is opened, the pipeline shall add to it one commit `chore(release): Bump version to vX.Y.Z` that sets `version` in `package.json` to `main`'s version with the patch number increased by one.
- **RF-19** — The bump commit shall change only the `version` field of `package.json`, keeping the file Prettier-clean.
- **RF-20** — When `main`'s version changes while a Dependabot PR is open, the pipeline shall update the PR's bump so its version is the new `main` version plus one patch, still as a single bump commit.
- **RF-21** — When a Dependabot PR is updated and its `version` already equals `main`'s version plus one patch, the pipeline shall not add another commit.
- **RF-22** — When Dependabot rebases or recreates its PR and the bump commit is lost, the pipeline shall add it again as in RF-18.
- **RF-23** — If a pull request is not authored by Dependabot, then the pipeline shall not change its version or push to its branch.
- **RF-24** — If the bump commit cannot be pushed to the Dependabot PR, then the pipeline shall fail a visible check on that PR and leave the branch unchanged.
- **RF-25** — The bump step shall not install or execute code from the Dependabot PR while it holds a token with write permission.

### SCA — dependencies

- **RF-26** — When a pull request into `main` is opened or updated, the pipeline shall scan `pnpm-lock.yaml` for known vulnerabilities and report it as a check on the PR.
- **RF-27** — The pipeline shall scan `main`'s `pnpm-lock.yaml` once a day on a schedule.
- **RF-28** — If the lockfile scan finds a blocking finding, then the SCA check shall fail and the PR shall not be mergeable.
- **RF-29** — If the lockfile scan finds only findings without a fixed version or below high severity, then the SCA check shall pass and report them.
- **RF-30** — When a lockfile scan finishes, the pipeline shall publish its findings in the repository's code scanning and list them (package, installed version, fixed version, severity, advisory id) in the job summary.

### SCA — images and SBOM

- **RF-31** — When `release.yaml` builds the images, the pipeline shall scan each image (both platforms) for known vulnerabilities of its OS packages and Node dependencies before publishing it.
- **RF-32** — If an image scan finds a blocking finding, then the release shall not publish any image to Docker Hub and shall not deploy, and the cluster shall keep the running version.
- **RF-33** — If an image scan finds only non-blocking findings, then the release shall publish and deploy as today and report the findings in the job summary and in code scanning.
- **RF-34** — When an image is published, the pipeline shall generate an SBOM of it in a standard format (SPDX or CycloneDX) naming the image, its version and its digest.
- **RF-35** — The pipeline shall keep each SBOM as a downloadable artifact of the release run, named with the image and the version.

### Exceptions

- **RF-36** — Where a finding is listed in the versioned exceptions file with its advisory id, a reason and an expiry date in the future, the SCA checks shall report it as excepted and not count it as blocking.
- **RF-37** — If an exception has expired, then the SCA checks shall treat the finding as if it had no exception and name the expired entry in the job summary.
- **RF-38** — If an exception lacks the advisory id, the reason or the expiry date, then the SCA checks shall fail and name the invalid entry.

### Integration with the existing pipeline

- **RF-39** — `test.yaml` (tests, build, SSR CSP) shall keep running and gating PRs into `main` as today, including Dependabot PRs.
- **RF-40** — `release.yaml` shall keep publishing `portfolio` and `portfolio-ssr`, pinning them by digest and checking `rollout status` when no blocking finding exists (constitution §10).
- **RF-41** — Every workflow of the pipeline shall declare the minimum token permissions it needs and pin third-party actions by full commit SHA, as the existing workflows do.
- **RF-42** — The pipeline shall not expose `API_URL`, `DOCKERHUB_TOKEN`, `KUBE_CONFIG`, `LOCAL_NETWORK` or any other secret to Dependabot PR runs or to SCA/CodeQL reports.

### Dependency build scripts

- **RF-43** — The repository shall provide one command that records the approval of the dependencies' build scripts in `allowBuilds` of `pnpm-workspace.yaml`.
- **RF-44** — When the pipeline installs dependencies (`test.yaml`, `release.yaml`, the CodeQL and SCA jobs and Dependabot's lockfile updates), the install shall finish without errors about build scripts pending approval.
- **RF-45** — If a dependency update introduces a package with a build script that is not in `allowBuilds`, then the install shall fail naming the package, and the PR shall stay unmergeable until the owner approves it with the command of RF-43.

## Out of scope

- Automatic merge of Dependabot PRs (discarded: every merge deploys to production, so the owner reviews each one).
- A bump other than patch for dependency PRs, or no bump for Actions-only PRs (discarded in favour of always patch).
- CodeQL `security-and-quality` suite or custom queries (discarded in favour of `security-extended`).
- Licence compliance checks of dependencies.
- DAST (scanning the running site), secret scanning changes (already enabled with push protection) and IaC scanning of Kubernetes manifests.
- Image signing or SBOM attestations pushed to the registry.
- Scanning images on pull requests; images are scanned only in the release.
- The `api` and `panel` repositories.
- Any change to the site's code, routes, CSP or runtime behaviour.

## Constraints

- **Infra/CI approval (AGENTS.md):** granted by the owner on 2026-10-25 for new and changed files under `.github/` (CodeQL, SCA and bump workflows, `dependabot.yml`), changes to `release.yaml` and the command of RF-43 (`scripts/` or `package.json` scripts).
- **Repository settings (manual, owner):** disable CodeQL default setup (RF-09); require the CodeQL, SCA and `test.yaml` checks on `main` through branch protection or a ruleset (RF-06, RF-28); create the Dependabot labels; allow the bump workflow to push to Dependabot branches.
- **Dependencies:** no change to `package.json` dependencies or `pnpm-lock.yaml` is expected; any CLI tool for SCA runs inside CI, not as a project dependency. If the plan needs one in `package.json`, that is a dependency approval.
- **Tooling risk:** Dependabot's support for the pnpm 12 lockfile must be verified in the plan; if unsupported, the npm ecosystem part of RF-10 to RF-13 needs a decision before implementation. Build-script approval is covered by RF-43 to RF-45.
- **Security of the bump (RF-25):** workflows triggered by Dependabot PRs with write permissions are a known attack surface; the plan must justify the trigger used.
- Constitution §6: the web handles no secrets; CI secrets stay in GitHub and never reach Dependabot runs or reports.
- Constitution §9 and §10: SemVer and Conventional Commits; `test.yaml` keeps gating `main`; `release.yaml` keeps pinning images by digest.

## Done criteria

- [ ] A test PR with a deliberately vulnerable pattern (e.g. reflected input into `innerHTML` in a throwaway branch) fails the CodeQL check; removing it makes the check pass.
- [ ] A test PR that pins a dependency to a version with a known critical/high advisory with a fix fails the SCA check; adding a valid exception makes it pass; an expired or incomplete exception makes it fail again.
- [ ] A Dependabot PR (or one triggered with `@dependabot recreate`) receives exactly one `chore(release): Bump version to vX.Y.Z` commit with `main`'s version plus one patch; after bumping `main`, the PR's bump is updated; a PR not authored by Dependabot is left untouched.
- [ ] The scheduled CodeQL and SCA runs appear daily in the Actions tab and their alerts in the Security tab.
- [ ] A release run scans both images, uploads one SBOM per image as an artifact, and still publishes, pins by digest and passes `rollout status`; a forced blocking finding stops it before publishing.
- [ ] `pnpm test --watch=false`, `pnpm build` and `scripts/check-ssr-csp.sh` pass; `pnpm exec prettier --check` is clean on the touched files (YAML and Markdown included).
- [ ] Installs in `test.yaml` and `release.yaml` show no build-script approval errors; a test PR adding a package with an unapproved build script fails until the RF-43 command approves it.
- [ ] CodeQL default setup is disabled and the required checks are configured on `main`.
- [ ] `version` in `package.json` bumped as a minor in `chore(release): Bump version to vX.Y.Z`.
