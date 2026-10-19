# Tasks 006 — Resume preview

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Order:** by dependency. A task starts only when the tasks under "Depends on" are done. Tasks with the same dependencies can run in parallel.
- **Ids:** `D#` = plan decision, `U-*` = unit tests and `M#` = manual checks listed in the plan's test strategy.
- **Approvals:** the `pdfjs-dist` dependency and deleting `public/Marco-Figueroa-Resume.pdf` were approved on 2026-10-18. `nginx.conf` stays unchanged (D7); if T09 finds a CSP violation, adding `worker-src 'self'` needs a new approval.

## Phase 1 — Foundations

- [x] **T01 — PDF renderer: `pdfjs-dist`, worker entry and `PdfRendererService`**
  - **RF:** RF-08, RF-10, RF-12, RF-14, RF-29
  - **Depends on:** — (can run in parallel with T02 and T03)
  - **Scope:**
    - `pnpm add pdfjs-dist@^6.4.299` (approved).
    - `core/services/pdf.worker.ts`: the one-line worker entry that imports `pdfjs-dist/build/pdf.worker.mjs` (D3). If TypeScript rejects the side-effect import, add the ambient declaration from the plan's risks.
    - `core/services/pdf-renderer.service.ts`: the `PDFJS_LOADER` token with the dynamic `import('pdfjs-dist')` and the worker port set once (D2, D3); `open(data)` with a copy of the bytes (D8), `enableXfa: false` and no scripting (D9; pdf.js 6 dropped `isEvalSupported`); `PdfDocument` with `pageCount`, `render(page, canvas, cssWidth)` fitted to the width × `devicePixelRatio` (D10) and `destroy()`.
    - `pdf-renderer.service.spec.ts` with a fake loader.
  - **Done when:** U-PR-1…U-PR-6 pass; `pnpm build` succeeds with no budget warning, its stats list pdf.js only as a lazy chunk and a `worker-*.js` file in `dist/devsonic.cl/browser`, and the server build does not fail on the worker (plan risk 1).
  - **Note:** nothing imports the service until T04, so the build drops it and the lazy chunk and `worker-*.js` cannot be seen yet. That check moved to T04.

- [x] **T02 — Resume request: `ResumeResult` and `ResumeService`**
  - **RF:** RF-04, RF-05, RF-13, RF-20, RF-27, RF-28, RF-30, RF-31
  - **Depends on:** — (can run in parallel with T01 and T03)
  - **Scope:**
    - `core/interfaces/resume.ts`: `ResumeResult` (D4).
    - `core/services/resume.service.ts`: `load(lang, signal)` → `GET {API_URL}/resume?lang=…` as `arraybuffer`, `RESUME_TIMEOUT_MS` = 30 s, abort through the signal (D5), never rejects (D4), successful bytes cached per `lang`, failures not cached (D6).
    - `resume.service.spec.ts` with `HttpTestingController`.
  - **Done when:** U-RS-1…U-RS-9 pass.

- [x] **T03 — Dictionary texts: `hero.viewResume` and `resumePreview`**
  - **RF:** RF-01, RF-16, RF-26
  - **Depends on:** — (can run in parallel with T01 and T02)
  - **Scope:**
    - `messages.en.ts` / `messages.es.ts`: add `hero.viewResume` ("View Resume" / "Ver CV") and the `resumePreview` block (`title`, `close`, `download`, `downloadLabel`, `retry`, `loading`, `page(n, total)`, `errors.notFound|generic|timeout`, `fileName`). `hero.downloadResume` stays until T05, so the build keeps passing.
    - `messages.spec.ts`: a `resume preview texts` block like the assistant one.
  - **Done when:** U-M-1…U-M-3 pass and `pnpm build` succeeds.

## Phase 2 — Preview dialog

- [ ] **T04 — Preview component: `components/resume-preview/`**
  - **RF:** RF-02–RF-08, RF-10, RF-11, RF-13, RF-15–RF-18, RF-20–RF-25, RF-27–RF-31
  - **Depends on:** T01, T02, T03
  - **Scope:**
    - `resume-preview.ts` / `.html` / `.spec.ts`, selector `app-resume-preview`: a native `<dialog>` with the `TestimonialDialog` pattern (D1); `loading | ready | error` states; one canvas per page labelled with `page(n, total)`; `ResizeObserver` re-render on width change only (D10); `download()` through a `Blob` URL with `fileName` (D11); `retry()`; `AbortController` + generation counter on close (D5); sticky header, full screen under `md`, centered `max-w-3xl` from `md`, `overscroll-behavior: contain` (D12). No component CSS file unless needed (4 kB budget).
    - The spec reuses the `showModal()`/`close()` emulation of `testimonial-dialog.spec.ts`, and fakes `ResumeService`, `PdfRendererService` and `ResizeObserver`.
  - **Done when:** U-RP-1…U-RP-16 pass and `pnpm build` shows no `anyComponentStyle` warning, lists pdf.js only as a lazy chunk and writes a `worker-*.js` file to `dist/devsonic.cl/browser`, and the server build does not fail on the worker (moved from T01).

## Phase 3 — Integration with the site

- [ ] **T05 — Hero trigger and page scroll lock**
  - **RF:** RF-01, RF-03, RF-09, RF-19
  - **Depends on:** T04
  - **Scope:**
    - `animated-button.ts`: `pressed = output<HTMLButtonElement>()`, emitted on click when there is no `href` (D13).
    - `hero.html` / `hero.ts`: the button without `href`, label `viewResume`, icon `fa-eye`, `(pressed)` opens `<app-resume-preview #preview />`.
    - Remove `hero.downloadResume` from both dictionaries.
    - `src/styles.css`: `html:has(dialog.resume-preview[open]) { overflow: hidden; }` (D12).
    - `hero.spec.ts` and, if it has a spec, `animated-button.spec.ts`.
  - **Done when:** U-H-1 and U-H-2 pass, and `grep -rn "downloadResume\|Marco-Figueroa-Resume.pdf" src` finds nothing.

- [ ] **T06 — Remove the static resume**
  - **RF:** RF-32
  - **Depends on:** T05
  - **Scope:** delete `public/Marco-Figueroa-Resume.pdf` (approved).
  - **Done when:** `git ls-files public | grep -i resume` is empty, and after `pnpm build` neither `dist/devsonic.cl/browser/Marco-Figueroa-Resume.pdf` exists nor `grep -rl "Marco-Figueroa-Resume.pdf" dist/devsonic.cl/browser` finds a page linking to it (only the `fileName` text in a JS chunk is allowed).

## Phase 4 — Verification and release

- [ ] **T07 — Quality gate**
  - **RF:** —
  - **Depends on:** T06
  - **Scope:** the closing commands from `AGENTS.md`.
  - **Done when:** `pnpm test --watch=false` passes (all U-RS, U-PR, U-RP, U-H and U-M cases included), `pnpm build` ends with no errors or exceeded budgets and the initial total is below 500 kB, `scripts/check-ssr-csp.sh` prints that the CSP covers every inline script, and `pnpm exec prettier --check .` is clean.

- [ ] **T08 — Manual checks against the local API**
  - **RF:** RF-08–RF-10, RF-13, RF-15–RF-16, RF-18–RF-25, RF-27–RF-28, RF-31
  - **Depends on:** T07
  - **Scope:** `api` 6.1.0 running locally with an English and a Spanish PDF assigned (`PUT /resume/assignments/en|es`), `pnpm start` against it. Record the results in this file under T08, as in Spec 001's T18.
  - **Done when:** M1–M5 are recorded as passed: language and Spanish fallback (M1), multi-page render and downloaded file names (M2), 1280 px / 375 px layout, scroll lock and rotation on a real phone (M3), keyboard-only use (M4), 404, API stopped and Retry (M5).

- [ ] **T09 — Built site and CSP check in the Docker `static` image**
  - **RF:** RF-14, RF-32, RF-33
  - **Depends on:** T07 (can run in parallel with T08)
  - **Scope:** `docker build --target static .` and `docker build --target ssr .` with local `API_URL`; open the preview in Chrome, Firefox and Safari with the console open.
  - **Done when:** M6 (`/Marco-Figueroa-Resume.pdf` answers 404) and M7 (no CSP violation when opening the preview; pdf.js and `worker-*.js` load only on the first open, seen in the network panel) are recorded as passed. If a browser blocks the worker, stop and ask to approve `worker-src 'self'` in `nginx.conf` (D7).

- [ ] **T10 — Version bump**
  - **RF:** —
  - **Depends on:** T08, T09
  - **Scope:** `package.json` `version` 4.1.0 → 4.2.0 (feat → minor).
  - **Done when:** a `chore(release): Bump version to v4.2.0` commit changes only `version`, and `pnpm build` still passes.

- [ ] **T11 — Production check after deploy**
  - **RF:** RF-04, RF-13, RF-33
  - **Depends on:** T10, and the merge into `main` with `release.yaml` finished
  - **Scope:** the plan's release steps 1, 2 and 4. Before merging, in `api` production: assign the English resume (and the Spanish one, if there is one) and confirm `https://marco.figueroa-sanchez.com` is enabled in `cors_origin`.
  - **Done when:** before merging, `curl -sI "https://api.figueroa-sanchez.com/resume?lang=es"` answers 200 with `Content-Type: application/pdf`; after `rollout status`, the preview opens on `/` and `/es` in production with no CORS or CSP error in the console, and one download saves the expected file name.

## RF → tasks

| RF    | Tasks              |
| ----- | ------------------ |
| RF-01 | T03, T05           |
| RF-02 | T04                |
| RF-03 | T04, T05           |
| RF-04 | T02, T04, T11      |
| RF-05 | T02, T04           |
| RF-06 | T04                |
| RF-07 | T04                |
| RF-08 | T01, T04, T08      |
| RF-09 | T05, T08           |
| RF-10 | T01, T04, T08      |
| RF-11 | T04                |
| RF-12 | T01                |
| RF-13 | T02, T04, T08, T11 |
| RF-14 | T01, T09           |
| RF-15 | T04, T08           |
| RF-16 | T03, T04, T08      |
| RF-17 | T04                |
| RF-18 | T04, T08           |
| RF-19 | T05, T08           |
| RF-20 | T02, T04           |
| RF-21 | T04, T08           |
| RF-22 | T04, T08           |
| RF-23 | T04, T08           |
| RF-24 | T04, T08           |
| RF-25 | T04, T08           |
| RF-26 | T03                |
| RF-27 | T02, T04, T08      |
| RF-28 | T02, T04, T08      |
| RF-29 | T01, T04           |
| RF-30 | T02, T04           |
| RF-31 | T02, T04, T08      |
| RF-32 | T06, T09           |
| RF-33 | T09, T11           |
