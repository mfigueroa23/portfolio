# AGENTS.md — Portfolio

## Project

Marco Figueroa's personal portfolio (marco.figueroa-sanchez.com), built with Angular 22 standalone + Tailwind v4, in English and in Spanish under `/es`. The home is prerendered; `/projects*`, `/experience` and `/blog*` are rendered on demand by a Node server (`src/server.ts`). It runs on Kubernetes as one pod with nginx (target `static`) and the SSR sidecar (target `ssr`). Content and forms come from the API (`API_URL`, defaults to `https://api.figueroa-sanchez.com`); the floating assistant chat talks to the personal assistant API (`AGENT_URL`, defaults to `https://agent.figueroa-sanchez.com`, `http://localhost:8000` locally).

## Commands

- Install: `pnpm install`
- Development: `pnpm start` (reads `API_URL` and `AGENT_URL` from `.env`; copy `.env.example`)
- Tests: `pnpm test --watch=false`
- Build (types and budgets): `pnpm build`
- Local SSR server: `node dist/devsonic.cl/server/server.mjs` (port 4000)
- CSP of the SSR routes (after `pnpm build`): `scripts/check-ssr-csp.sh`
- Formatting: `pnpm exec prettier --check .` (`--write` to fix)
- Images: `docker build --target static .` and `docker build --target ssr .` (`--build-arg API_URL=<url> --build-arg AGENT_URL=<url>`)

## Style and conventions

- TypeScript ~6, Angular 22: standalone components and signals (`signal`, `input`, `computed`); no NgModules or `@Input`.
- Files without the `.component` suffix: `button.ts`/`.html`/`.css`/`.spec.ts`, class `Button`, selector `app-button`.
- `src/app/`: `core/` (config, i18n, interfaces, services, utils), `components/` (reusable UI), `sections/` (home blocks), `pages/` (lazy routes).
- Styles with Tailwind utilities; minimal per-component CSS (4kB budget).
- Prettier: 100 columns, single quotes, 2 spaces.
- Code, comments, commits and docs in English (Conventional Commits); UI in English and Spanish; replies to the user in Spanish.

## Rules

- Read `docs/constitution.md` and the active spec (`docs/specs/NNN-*/spec.md`) before touching code.
- Ask for approval before:
  - adding or updating dependencies (`package.json`, `pnpm-lock.yaml`);
  - adding SSR routes (`app.routes.server.ts`) or changing `angular.json`/budgets;
  - changing infra or CI: `Dockerfile`, `nginx.conf`, `docker/`, `scripts/`, `.github/workflows/`;
  - editing personal content (experience, CV in `public/`, contact details, `README.md`) or files in `docs/`.
- Every UI text lives in `core/i18n/messages.en.ts` and `messages.es.ts`, never in templates; internal links go through `LanguageService.href()`.
- Mermaid is loaded only through dynamic `import()` (`MermaidService`).

## When finishing any task

- `pnpm test --watch=false`, `pnpm build` and `scripts/check-ssr-csp.sh` pass with no errors or exceeded budgets.
- `pnpm exec prettier --check` is clean on the touched files.
- Bump `version` in `package.json` (SemVer: fix → patch, feat → minor, breaking → major) in a `chore(release): Bump version to vX.Y.Z` commit.
