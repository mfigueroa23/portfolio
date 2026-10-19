# Plan 006 — Resume preview

- **Spec:** [spec.md](spec.md) (approved 2026-10-18)
- **Status:** Approved
- **Version:** 4.2.0 (feat → minor)

The plan keeps the fixed stack (constitution §1) and adds one dependency, `pdfjs-dist@6.4.299`,
approved with the spec. pdf.js and its worker load only through a dynamic `import()` and a worker
chunk, so the initial bundle stays under 500 kB (§3, RF-14). The request goes through a new
service in `core/services/`, the only place that injects `HttpClient` (§5). The visitor only sees
dictionary texts (§7). The dialog is a native `<dialog>` with visible focus (§8), and nothing runs
during prerendering or SSR (§2, RF-02). No infra file changes: the current CSP already allows a
same-origin worker (D7). Deleting `public/Marco-Figueroa-Resume.pdf` (personal content, RF-32) was approved on
2026-10-18.

## Endpoints

The web consumes, unchanged, an endpoint of `api` 6.1.0 (Spec 005):

| Method and route                   | Auth | Response                                                                                                      | RF                  |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| `GET {API_URL}/resume?lang=en\|es` | —    | 200 `application/pdf` (Spanish falls back to English); 404 `{ error }` with no resume; 400 for another `lang` | RF-04, RF-13, RF-27 |

## Modules

### New: `src/app/core/interfaces/resume.ts`

| File        | Responsibility                                                                                                                                          | RF          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `resume.ts` | `ResumeResult`: `{ ok: true, data: Uint8Array }` or `{ ok: false, reason: 'not-found' \| 'generic' \| 'timeout' }`, in the style of `AgentResult` (D4). | RF-27–RF-30 |

### New: `src/app/core/services/resume.service.ts` (`ResumeService`)

| File                     | Responsibility                                                                                                                                                                                                                                                                                                                                                                | RF                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `resume.service.ts`      | `load(lang, signal)`: `GET {API_URL}/resume` with `params: { lang }` and `responseType: 'arraybuffer'`, a 30 s `timeout` (`RESUME_TIMEOUT_MS`), aborted when `signal` fires (D5). Never rejects: maps 404 → `not-found`, `TimeoutError` → `timeout`, anything else → `generic` (D4). Keeps the bytes of a successful load per `lang` and returns them without a request (D6). | RF-04, RF-05, RF-20, RF-27, RF-28, RF-30 |
| `resume.service.spec.ts` | U-RS-1…U-RS-9.                                                                                                                                                                                                                                                                                                                                                                |                                          |

### New: `src/app/core/services/pdf-renderer.service.ts` (`PdfRendererService`)

| File                           | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | RF                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `pdf-renderer.service.ts`      | `PDFJS_LOADER` token (like `MERMAID_LOADER`): `import('pdfjs-dist')` and, once, `GlobalWorkerOptions.workerPort = new Worker(new URL('./pdf.worker', import.meta.url), { type: 'module' })` (D2, D3). `open(data)` loads a **copy** of the bytes (D8) with `isEvalSupported: false` and no scripting (D9) and returns a `PdfDocument`: `pageCount`, `render(page, canvas, cssWidth)` (scale = width / page width × `devicePixelRatio`, D10) and `destroy()`. A loader or parse failure rejects. | RF-08, RF-10, RF-12, RF-14, RF-29 |
| `pdf.worker.ts`                | Worker entry, one line: imports `pdfjs-dist/build/pdf.worker.mjs`, so Angular bundles it as a hashed `worker-*.js` served from `'self'` (D3).                                                                                                                                                                                                                                                                                                                                                   | RF-14, RF-33                      |
| `pdf-renderer.service.spec.ts` | U-PR-1…U-PR-6, with a fake loader (pdf.js never loads in tests).                                                                                                                                                                                                                                                                                                                                                                                                                                |                                   |

### New: `src/app/components/resume-preview/` (`ResumePreview`, `app-resume-preview`)

| File                     | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | RF                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `resume-preview.ts`      | Native modal `<dialog>` with the `TestimonialDialog` pattern (`open(trigger)`, `close()`, `onClosed()` returns focus, backdrop click, Escape) (D1). State signal `loading \| ready \| error(reason)`. On open: focuses Close, starts `ResumeService.load(lang)` with a fresh `AbortController`, then `PdfRendererService.open()` and renders every page into one `<canvas>` each after render. On close: aborts, destroys the document and ignores late results (generation counter, like `AssistantConversationService`). A `ResizeObserver` on the scroll area re-renders when the width changes (D10). `download()` saves the loaded bytes through a `Blob` URL and an `<a download>` with the dictionary file name, then revokes it (D11). `retry()` repeats the load. | RF-03–RF-12, RF-15–RF-25, RF-27–RF-31    |
| `resume-preview.html`    | `aria-labelledby` title, header with Download (disabled until `ready`) and Close, always visible (sticky); scroll area with `overscroll-behavior: contain`; loading text in `role="status"`; error text in `role="alert"` with Retry; each canvas `role="img"` with `aria-label` `pageOf(n, total)`. Full screen under `md`, centered `max-w-3xl` `h-[90dvh]` from `md` (Tailwind) (D12).                                                                                                                                                                                                                                                                                                                                                                                  | RF-06, RF-07, RF-11, RF-21, RF-24, RF-25 |
| `resume-preview.spec.ts` | U-RP-1…U-RP-16, with fake `ResumeService` and `PdfRendererService`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                          |

### Changed

| File                                                    | Change                                                                                                                                                                                                                                                                   | RF                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `src/app/sections/hero/hero.html`, `hero.ts`            | The `app-animated-button` loses `href`; its click calls `preview.open(<the inner button>)`; `<app-resume-preview #preview />` next to it. Icon `fa-eye` instead of `fa-download`.                                                                                        | RF-01, RF-03, RF-19 |
| `src/app/components/animated-button/animated-button.ts` | New `pressed = output<HTMLButtonElement>()`, emitted with the button on click when there is no `href`, so the hero gets the element to return focus to (D13). The unused `download` input is left as is.                                                                 | RF-03, RF-19        |
| `src/app/sections/hero/hero.spec.ts`                    | U-H-1, U-H-2.                                                                                                                                                                                                                                                            |                     |
| `src/app/core/i18n/messages.en.ts`, `messages.es.ts`    | `hero.downloadResume` → `hero.viewResume` ("View Resume" / "Ver CV"). New `resumePreview` block: `title`, `close`, `download`, `retry`, `loading`, `page(n, total)`, `notFound`, `error`, `timeout`, `fileName` (`Marco-Figueroa-Resume.pdf` / `Marco-Figueroa-CV.pdf`). | RF-01, RF-16, RF-26 |
| `src/app/core/i18n/messages.spec.ts`                    | U-M-1…U-M-3, like the `assistant texts` block.                                                                                                                                                                                                                           |                     |
| `src/styles.css`                                        | `html:has(dialog.resume-preview[open]) { overflow: hidden; }` so the page behind does not scroll (D12).                                                                                                                                                                  | RF-09               |

### Infrastructure

| File                                                   | Change                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `package.json`, `pnpm-lock.yaml`                       | `pdfjs-dist` `^6.4.299` in `dependencies` (approved). Its optional `@napi-rs/canvas` is Node-only and needs no `allowBuilds`. |
| `public/Marco-Figueroa-Resume.pdf`                     | Deleted (approved, RF-32).                                                                                                    |
| `nginx.conf`, `Dockerfile`, `angular.json`, `scripts/` | No change (D3, D7).                                                                                                           |
| `package.json` `version`                               | 4.1.0 → 4.2.0 in `chore(release): Bump version to v4.2.0`.                                                                    |

## Data model

No persistent data. The only state is in memory:

- `ResumeService`: the bytes of the last successful load per `lang`. The language is fixed for the
  life of the app (every link is a full page load, `LanguageService`), so in practice it holds one
  PDF. Failures are not kept, so Retry always reaches the API.
- `ResumePreview`: the open `PdfDocument`, destroyed on close.

## Decisions

| #   | Decision                                                                                                                                                               | Discarded alternative                                                                | Why                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Native `<dialog>` + `showModal()`, the `TestimonialDialog` pattern.                                                                                                    | A custom overlay with its own focus trap, like the assistant panel.                  | `showModal()` gives the modal role, the focus trap, inert page and Escape for free (RF-21–RF-23), and the repo already tests it in jsdom.                                                                                                           |
| D2  | pdf.js behind a `PDFJS_LOADER` token with a dynamic `import()`, loaded on the first open.                                                                              | A static import in the component.                                                    | A static import would put pdf.js (~400 kB) in the home's initial bundle (RF-14, §3). The token lets specs replace the import, as `MERMAID_LOADER` does (§4, no network).                                                                            |
| D3  | A real worker built from `pdf.worker.ts` with `new Worker(new URL('./pdf.worker', import.meta.url))`, bundled by `@angular/build`.                                     | Copying `pdf.worker.min.mjs` with an `angular.json` asset and setting `workerSrc`.   | The builder already bundles workers by that syntax (no `webWorkerTsConfig` needed) with a hashed name served from `'self'`. The asset copy needs an `angular.json` change (approval) and an unhashed file that caches badly.                        |
| D4  | `ResumeService.load()` never rejects and returns `ResumeResult` with `not-found`, `generic` or `timeout`.                                                              | Throw `HttpErrorResponse` and map it in the component.                               | Same contract as `AssistantService.send()` (plan 001 D5). The component only maps a reason to a dictionary text (RF-27, RF-28, RF-30, §7). The API's `{ error }` is never shown, unlike `apiErrorText`, because RF-27 asks for the dictionary text. |
| D5  | Cancel with an `AbortSignal` that unsubscribes the `HttpClient` call (`takeUntil` an abort event), plus a generation counter in the component.                         | Only a generation counter, as in `AssistantConversationService`.                     | RF-20 asks to cancel the request, not just ignore it; unsubscribing aborts the fetch. The counter also covers the rendering steps that cannot be aborted.                                                                                           |
| D6  | Cache the bytes in the root `ResumeService`, keyed by `lang`.                                                                                                          | Cache in the component, or rely on the browser cache (`ETag`, 304).                  | RF-05 asks for no new request; a 304 is still a request. The service outlives the component, and keying by `lang` matches the spec's "same language".                                                                                               |
| D7  | No CSP change: the worker comes from `'self'` and `worker-src` falls back to `script-src 'self'`; the PDF arrives through `connect-src` `API_URL`.                     | Add `worker-src 'self'` to `nginx.conf`.                                             | The current policy already allows it (RF-33), and every `nginx.conf` change needs approval. If the manual check (M7) shows a violation, the explicit `worker-src 'self'` is the fallback and is asked for then.                                     |
| D8  | Pass a copy of the bytes to pdf.js (`data.slice()`).                                                                                                                   | Pass the cached buffer.                                                              | pdf.js transfers the buffer to the worker and detaches it; Download (RF-15) and reopening (RF-05) need the original intact.                                                                                                                         |
| D9  | Canvas-only rendering: `isEvalSupported: false`, no text, annotation or form layers, no scripting.                                                                     | The pdf.js viewer components (`pdf_viewer`), with text selection and links.          | RF-12 forbids scripts and forms; RF-33 forbids CSP violations (eval). Text and links are out of scope, and the viewer would add CSS and code for features the spec excludes.                                                                        |
| D10 | Fit each page to the scroll area's width (`cssWidth / viewport.width`), canvas pixels × `devicePixelRatio`; a `ResizeObserver` re-renders only when the width changes. | A fixed scale with CSS `width: 100%`.                                                | A fixed scale is blurry on HiDPI screens or wasteful on phones; re-rendering on width keeps text sharp after rotation (RF-08, RF-10).                                                                                                               |
| D11 | Download from a `Blob` URL of the cached bytes with the dictionary name.                                                                                               | Link to `GET /resume`.                                                               | The API answers `Content-Disposition: inline` from another origin, so `download` would be ignored, and it would be a second request (RF-15, RF-16).                                                                                                 |
| D12 | Lock page scroll with an `html:has(dialog.resume-preview[open])` rule in `styles.css`, plus `overscroll-behavior: contain` on the scroll area.                         | Toggle a class on `<body>` from the component.                                       | The `:has()` rule follows the dialog's real `open` state, with no DOM writes to clean up on close (RF-09). The component CSS stays empty (4 kB budget).                                                                                             |
| D13 | `AnimatedButton` emits `pressed` with its `<button>` when it has no `href`.                                                                                            | Read `document.activeElement` in the hero, or swap the hero button for `app-button`. | Focus must return to the real button (RF-19); `activeElement` is unreliable on Safari, where a click does not focus buttons. Keeping `AnimatedButton` keeps the hero's look (RF-01).                                                                |

## RF coverage

| RF                  | Where                                                         | Tests                       |
| ------------------- | ------------------------------------------------------------- | --------------------------- |
| RF-01               | `hero.html`, `messages.*.ts`                                  | U-H-1, U-M-2                |
| RF-02               | `ResumePreview` (loads only on `open()`)                      | U-RP-1                      |
| RF-03               | `hero.html`, `AnimatedButton.pressed`, `ResumePreview.open()` | U-H-2, U-RP-2               |
| RF-04               | `ResumeService.load()`                                        | U-RS-1, U-RP-2              |
| RF-05               | `ResumeService` cache                                         | U-RS-6, U-RP-3              |
| RF-06, RF-07        | `resume-preview.html` (`loading` state)                       | U-RP-4                      |
| RF-08               | `ResumePreview` render loop, `PdfRendererService.render()`    | U-PR-3, U-RP-5              |
| RF-09               | `styles.css` `:has()` rule, `overscroll-behavior`             | M3 (manual)                 |
| RF-10               | `ResizeObserver` in `ResumePreview`                           | U-RP-6, M3                  |
| RF-11               | canvas `aria-label` with `page(n, total)`                     | U-RP-5                      |
| RF-12               | `PdfRendererService.open()` options                           | U-PR-2                      |
| RF-13               | No special case: any 200 is rendered                          | U-RS-1, M1                  |
| RF-14               | `PDFJS_LOADER`, `pdf.worker.ts`                               | U-PR-1, U-PR-6, build stats |
| RF-15, RF-17        | `ResumePreview.download()`                                    | U-RP-7                      |
| RF-16               | `resumePreview.fileName`                                      | U-RP-7, U-M-3               |
| RF-18               | `close()`, backdrop click, Escape                             | U-RP-8                      |
| RF-19               | `onClosed()` focuses the trigger                              | U-RP-8, U-H-2               |
| RF-20               | `AbortController` + generation counter                        | U-RS-7, U-RP-9              |
| RF-21, RF-22, RF-23 | `<dialog>` + `showModal()`, focus on Close                    | U-RP-10, M4                 |
| RF-24, RF-25        | Tailwind classes in `resume-preview.html`                     | M3                          |
| RF-26               | `messages.*.ts`                                               | U-M-1, U-M-2                |
| RF-27               | `not-found` → `notFound`                                      | U-RS-2, U-RP-11             |
| RF-28               | `generic` → `error`                                           | U-RS-3, U-RS-4, U-RP-12     |
| RF-29               | `PdfRendererService.open()` rejects → `error`                 | U-PR-4, U-RP-13             |
| RF-30               | `timeout(RESUME_TIMEOUT_MS)` → `timeout`                      | U-RS-5, U-RP-12             |
| RF-31               | `retry()`                                                     | U-RS-8, U-RP-14             |
| RF-32               | `public/` file deleted, `hero.html` without `href`            | U-H-1, M6                   |
| RF-33               | D7, worker from `'self'`                                      | M7                          |

## Test strategy

Unit tests with Vitest and jsdom, without network: `HttpTestingController` for the API, fake
loaders for pdf.js and the `showModal()`/`close()` emulation from `testimonial-dialog.spec.ts`.
This repo has no e2e suite; the visual and browser-only parts are the manual checks M1–M7.

**`ResumeService` (U-RS):**

- U-RS-1 — `load('es')` sends `GET {API_URL}/resume?lang=es` with `arraybuffer`; a 200 (also an English PDF for `es`) gives `{ ok: true, data }` with the same bytes.
- U-RS-2 — 404 → `{ ok: false, reason: 'not-found' }`.
- U-RS-3 — 400, 500 and 503 → `generic`; the body is never returned.
- U-RS-4 — Network/CORS failure (status 0, `ProgressEvent`) → `generic`.
- U-RS-5 — No answer in `RESUME_TIMEOUT_MS` (fake timers) → `timeout`, and the request is cancelled.
- U-RS-6 — A second `load('es')` after a success returns the cached bytes with no request (`expectNone`).
- U-RS-7 — Aborting the signal cancels the request (`req.cancelled`) and the promise resolves without caching.
- U-RS-8 — After a failure, a new `load()` sends a new request (failures are not cached).
- U-RS-9 — The cache is per language: `load('en')` after `load('es')` sends a request.

**`PdfRendererService` (U-PR):**

- U-PR-1 — The loader is not called until the first `open()`, and only once for several opens.
- U-PR-2 — `open()` calls `getDocument` with `isEvalSupported: false`, scripting off, and a copy of the bytes (the original buffer keeps its length).
- U-PR-3 — `render(page, canvas, 600)` sets the scale from the page width and `devicePixelRatio`, sizes the canvas in device pixels and in CSS pixels.
- U-PR-4 — A `getDocument` failure (invalid PDF) or a loader failure rejects.
- U-PR-5 — `destroy()` destroys the pdf.js document.
- U-PR-6 — The worker port is set once (the real loader is not called in tests; this is checked by the build in M7).

**`ResumePreview` (U-RP):**

- U-RP-1 — Created without opening (as in prerendering): no call to `ResumeService` or the renderer.
- U-RP-2 — `open()` shows the dialog and calls `load()` with the page language.
- U-RP-3 — Close and reopen: shows the PDF again; the service is asked again but answers from its cache (no second HTTP request is covered by U-RS-6).
- U-RP-4 — While loading: `role="status"` with `loading`, Download disabled, Close enabled.
- U-RP-5 — With 3 pages: 3 canvases in order, labelled `page(1, 3)`…`page(3, 3)`; Download enabled.
- U-RP-6 — A width change reported by the `ResizeObserver` (stubbed) re-renders every page; a height-only change does not.
- U-RP-7 — Download creates an object URL of the cached bytes, clicks an anchor with `download` set to `fileName` in the page language, revokes the URL and keeps the dialog open, with no new `load()`.
- U-RP-8 — Close, Escape and a backdrop click close the dialog and focus the trigger; a click inside the content does not close it.
- U-RP-9 — Closing while loading aborts the signal; a late result or render does not change the state or draw.
- U-RP-10 — The dialog has `aria-labelledby` pointing to the title; on open, focus is on Close; every button has an accessible name.
- U-RP-11 — `not-found` shows `notFound` in `role="alert"`, with Retry and Close.
- U-RP-12 — `generic` shows `error`; `timeout` shows `timeout`.
- U-RP-13 — A renderer rejection shows `error`.
- U-RP-14 — Retry calls `load()` again and, on success, renders the pages.
- U-RP-15 — Spanish page (`/es`): texts and file name in Spanish.
- U-RP-16 — Opening again after a close starts in a clean state (no previous error or canvases).

**Hero (U-H) and dictionaries (U-M):**

- U-H-1 — The hero button reads `viewResume` and nothing in the hero links to `/Marco-Figueroa-Resume.pdf`.
- U-H-2 — Clicking it opens the preview with the inner `<button>` as trigger.
- U-M-1 — `resumePreview` has the same keys in English and Spanish.
- U-M-2 — No blank text in `resumePreview` or `hero.viewResume`, in both languages.
- U-M-3 — `fileName` ends in `.pdf` and differs per language.

**Not covered by unit tests** (jsdom has no canvas, real worker, layout or CSP): real drawing,
sharpness, scroll lock, layout per breakpoint and the CSP. They go to the manual checks:

- M1 — Local API with EN and ES assigned: `/` shows EN, `/es` shows ES; with only EN assigned, `/es` shows EN.
- M2 — A multi-page PDF: every page in order; Download saves `Marco-Figueroa-Resume.pdf` / `Marco-Figueroa-CV.pdf`, and opening it gives the same PDF.
- M3 — 1280 px and 375 px (devtools and a real phone): centered vs full screen, header always visible, page behind does not scroll, rotation re-fits.
- M4 — Keyboard only: Tab stays in the dialog, Escape closes, focus back on the button.
- M5 — Errors: no resume (404), API stopped (generic), Retry after starting it again.
- M6 — `/Marco-Figueroa-Resume.pdf` answers 404 in the built site.
- M7 — Docker `static` image: no CSP violation in the console when opening the preview, and the build stats show pdf.js and `worker-*.js` as lazy chunks, outside the initial total.

## Implementation order

1. Add `pdfjs-dist`; create `pdf.worker.ts` and `PdfRendererService` with the loader; `pnpm build` to confirm the worker chunk, the lazy chunk and that the SSR build does not break (risk 1).
2. `ResumeResult` and `ResumeService` with their specs.
3. Dictionaries: `hero.viewResume` and the `resumePreview` block, with their specs.
4. `ResumePreview` component (template, states, render, resize, download, retry, cancel) and its spec.
5. `AnimatedButton.pressed`, hero wiring and specs; `styles.css` scroll lock.
6. Delete `public/Marco-Figueroa-Resume.pdf`.
7. `pnpm test --watch=false`, `pnpm build`, `scripts/check-ssr-csp.sh`, `pnpm exec prettier --check`; manual checks M1–M7.
8. `chore(release): Bump version to v4.2.0`.

## Release

1. **Before merging:** in production `api` (6.1.0), assign the English resume (`PUT /resume/assignments/en`) and, if there is one, the Spanish one. Check `GET https://api.figueroa-sanchez.com/resume?lang=es` returns a PDF.
2. Check that `https://marco.figueroa-sanchez.com` is enabled in the API's `cors_origin` table (it already is for content reads).
3. Merge into `main`; `test.yaml` passes and `release.yaml` publishes and pins both images.
4. After `rollout status`: open the preview on `/` and `/es` in production with the console open (no CSP or CORS errors) and download it once.
5. Rollback: revert the release; the old image still has the static PDF.

## Risks

- **Worker bundling in the SSR build:** the server compilation also sees `new Worker(new URL(…))`. Impact: a build error or an extra worker file in `server/`. Mitigation: step 1 builds before anything else; if it fails, move the loader to a module only reached from the browser (`isPlatformBrowser`) or ask for `webWorkerTsConfig` in `angular.json`.
- **Worker typings:** with TypeScript 6, a side-effect import of a module without types can fail (`noUncheckedSideEffectImports`). Mitigation: import the `.mjs` that ships types; otherwise a one-line ambient declaration next to `pdf.worker.ts`.
- **Browser support of pdf.js 6:** the modern build needs recent engines (older iOS Safari may lack the APIs it uses). Impact: the preview shows the generic error (RF-29) and the visitor cannot download. Mitigation: check in M3 on the oldest iOS available; the `legacy` build is the fallback, at the cost of a bigger lazy chunk.
- **CSP fallback (D7):** a browser that does not fall back from `worker-src` to `script-src` would block the worker. Mitigation: M7 in Chrome, Firefox and Safari; if one blocks, ask to add `worker-src 'self'` to `nginx.conf`.
- **PDF features needing extra files:** non-embedded standard fonts or JPEG 2000 images make pdf.js fetch font data or WASM (and WASM needs `'wasm-unsafe-eval'`). Impact: wrong glyphs or a render error. Mitigation: the resume PDF embeds its fonts (checked in M2); document the limit in the plan rather than serving those files.
- **No resume assigned at release:** the preview shows "not available" for everyone. Mitigation: release step 1 before merging.
