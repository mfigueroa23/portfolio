# Constitution — Portfolio

Non-negotiable principles. Every spec, plan and task must follow them.

1. **Fixed stack:** Angular 22 standalone + signals, Tailwind v4, TypeScript ~6, pnpm 12. Any new dependency in `package.json` requires approval.
2. **Rendering:** the home and `/es` are prerendered; `/projects*`, `/experience`, `/blog*` and their `/es/…` mirror use `RenderMode.Server` in `app.routes.server.ts`. Server code lives only in `src/server.ts` and `src/server/`; nothing in `src/app/` imports `node:*`.
3. **Quality:** `pnpm build` finishes with no errors or exceeded budgets (initial < 500kB, component styles < 4kB) and `pnpm exec prettier --check .` is clean.
4. **Tests:** every component, service and util has its `*.spec.ts` next to it; `pnpm test --watch=false` passes without network (HTTP mocked with `HttpTestingController`).
5. **Data:** content and forms come only from the API through `src/app/core/services/` (the only place that injects `HttpClient`). Client validation (`core/utils/`) mirrors the API's, it does not replace it.
6. **Configuration:** the only variables are `API_URL` (content and forms API) and `AGENT_URL` (personal assistant API, Spec 001), both public build-time values passed in by `scripts/ng.mjs` (`--define`); their origins are the only ones allowed in the CSP `connect-src` besides `'self'`. The web handles no secrets and `.env` is never committed.
7. **Errors:** the user only sees the API's `{ error }` or the dictionary's generic text (`apiErrorText`), never stack traces or raw bodies.
8. **Language and accessibility:** code and commits in English; every UI text exists in `messages.en.ts` and `messages.es.ts`. Semantic HTML, `alt` on every `<img>` and visible focus on every interactive element.
9. **Delivery:** every new feature starts from a spec in `docs/specs/NNN-*/`. SemVer in `package.json` and Conventional Commits; `test.yaml` (tests, build and CSP) passes before merging into `main`.
10. **Deployment:** `release.yaml` publishes `portfolio` and `portfolio-ssr` and pins them by digest; `rollout status` succeeds and nginx answers `/healthz`.
