# Plan 008 — Certificate preview

- **Spec:** [spec.md](spec.md) (approved 2026-10-22)
- **Status:** Approved
- **Version:** 4.4.0 (feat → minor)

The plan keeps the fixed stack and adds no dependency: PDFs reuse `PdfRendererService` and the
`pdfjs-dist` approved in Spec 006 (constitution §1, RF-16). The file request goes through a new
service in `core/services/`, the only place that injects `HttpClient` (§5), and only for files on
the `API_URL` origin, which is already in `connect-src` (§6). Images are shown from a `data:` URL,
which the current `img-src 'self' data: https:` allows, so `nginx.conf` and `scripts/` do not
change (D6, RF-35). The visitor only sees dictionary texts (§7); the dialog is the native
`<dialog>` of the resume preview, with visible focus (§8); nothing loads during prerendering or
SSR (§2, RF-03). Nothing needs approval beyond the spec.

## Endpoints

The web consumes, unchanged, the file URL that `api` stores in each certification's `fileUrl`:

| Method and route                                        | Auth | Response                                                                                                                                                                                                                           | RF                         |
| ------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `GET {fileUrl}` (on the `API_URL` origin, `/files/:id`) | —    | 200 with `Content-Type` `application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp` or `image/svg+xml` (sniffed on upload), `Cache-Control: immutable`, CORS from `cors_origin`; 404 `{ error }` when the file is gone | RF-05, RF-10, RF-11, RF-29 |

## Modules

### New: `src/app/core/interfaces/file-preview.ts`

| File              | Responsibility                                                                                                                                                                                                                                                                                                                                                                                       | RF          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `file-preview.ts` | `PreviewFile` (`{ kind: 'pdf' \| 'image'; mime: string; data: Uint8Array<ArrayBuffer> }`), `PreviewFailure` (`'not-found' \| 'generic' \| 'timeout' \| 'unsupported'`), `PreviewResult` (`{ ok: true, file }` or `{ ok: false, reason }`) and `PreviewSource`: what a dialog opens (title, title `lang`, texts, download name, `load(signal)`, the failure used when the file cannot be drawn) (D1). | RF-29–RF-33 |

### New: `src/app/core/services/certificate.service.ts` (`CertificateService`)

| File                          | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                 | RF                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `certificate.service.ts`      | `load(fileUrl, signal)`: `GET fileUrl` with no params, `responseType: 'arraybuffer'`, `observe: 'response'`, through `getBinary()` (D3). Reads the `Content-Type` without parameters: `application/pdf` → `pdf`; `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml` → `image`; anything else → `unsupported` (D4, D11). Keeps successful loads by URL and returns them with no request (D5). Never rejects. | RF-05, RF-06, RF-22, RF-29–RF-31, RF-33 |
| `certificate.service.spec.ts` | U-CS-1…U-CS-10.                                                                                                                                                                                                                                                                                                                                                                                                                |                                         |
| `binary-request.ts`           | `getBinary(http, url, options, signal)`: the `timeout(RESUME_TIMEOUT_MS)` + `takeUntil(abort)` pipeline and the 404 / timeout / generic mapping that `ResumeService` has today, shared by both services (D3). The constant moves here as `FILE_TIMEOUT_MS`; `RESUME_TIMEOUT_MS` stays exported as an alias.                                                                                                                    | RF-22, RF-29–RF-31                      |
| `binary-request.spec.ts`      | U-BR-1…U-BR-5.                                                                                                                                                                                                                                                                                                                                                                                                                 |                                         |

### New: `src/app/components/file-preview/` (`FilePreview`, `app-file-preview`)

| File                   | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | RF                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `file-preview.ts`      | Today's `ResumePreview` logic, moved and generalised (D2): `open(trigger, source: PreviewSource)`, `close()`, `onClosed()` (focus back to the trigger), backdrop click, Escape, generation counter and `AbortController` (plan 006 D5), the PDF path (`PdfRendererService`, `ResizeObserver`, next-frame draw; plan 006 D10), `retry()` and `download()` (Blob URL, `source.fileName(file)`; plan 006 D11). New image path: a `data:` URL built from the bytes (D6), shown in an `<img>`; its `error` event → `source.renderFailure`. State: `loading \| pdf(pageCount) \| image(src) \| error(reason)`. Retry is hidden for `unsupported` (RF-33). | RF-04, RF-08–RF-15, RF-17, RF-19–RF-25, RF-29–RF-33 |
| `file-preview.html`    | `resume-preview.html` moved, with the title from `source.title` and its `[attr.lang]` (RF-07); texts from `source.texts`; the `<img>` branch `class="block w-full h-auto bg-white"`, `alt` = title (RF-11, RF-14, D7). Dialog class `file-preview` for the scroll lock.                                                                                                                                                                                                                                                                                                                                                                             | RF-07, RF-08, RF-11, RF-14, RF-23, RF-26, RF-27     |
| `file-preview.spec.ts` | U-FP-1…U-FP-12 (image path, unsupported, title `lang`, render failure per source), with fake `PdfRendererService` and the `showModal()` emulation of `resume-preview.spec.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                     |

### New: `src/app/components/certificate-preview/` (`CertificatePreview`, `app-certificate-preview`)

| File                          | Responsibility                                                                                                                                                                                                                                                                                                                                        | RF                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `certificate-preview.ts`      | Wraps `<app-file-preview>`. `certification = input.required<Certification>()`; `open(trigger)` builds the `PreviewSource`: title `name`, `lang` = `LanguageService.itemLang(cert)`, texts `m().certificatePreview`, `load` = `CertificateService.load(cert.fileUrl)`, `fileName` = `certificateFileName(name, mime)`, `renderFailure: 'unsupported'`. | RF-04, RF-05, RF-07, RF-18 |
| `certificate-preview.html`    | `<app-file-preview />`.                                                                                                                                                                                                                                                                                                                               |                            |
| `certificate-preview.spec.ts` | U-CP-1…U-CP-4.                                                                                                                                                                                                                                                                                                                                        |                            |

### New: `src/app/core/utils/file-name.ts`

| File                | Responsibility                                                                                                                                                                                                                                                            | RF    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `file-name.ts`      | `certificateFileName(name, mime)`: NFD, drop diacritics, lowercase, every run of non-alphanumerics → `-`, trimmed, plus the extension of the mime (`pdf`, `png`, `jpg`, `gif`, `webp`, `svg`). An empty result (a name of only symbols) falls back to `certificate` (D8). | RF-18 |
| `file-name.spec.ts` | U-FN-1…U-FN-4.                                                                                                                                                                                                                                                            |       |

### Changed

| File                                                                               | Change                                                                                                                                                                                                                                                                                                                                                                                                  | RF                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `src/app/components/resume-preview/resume-preview.ts`, `.html`                     | Becomes a thin wrapper over `<app-file-preview>` with the same selector and `open(trigger)` (D2): title `m().resumePreview.title`, texts `m().resumePreview`, `load` = `ResumeService.load(lang)` mapped to a `pdf` `PreviewFile`, `fileName` = `m().resumePreview.fileName`, `renderFailure: 'generic'`. `hero.html` does not change.                                                                  | RF-34                      |
| `src/app/components/resume-preview/resume-preview.spec.ts`                         | Unchanged cases (U-RP-1…U-RP-16 keep passing as the RF-34 regression net); only imports or helpers move if the DOM queries need it.                                                                                                                                                                                                                                                                     | RF-34                      |
| `src/app/core/services/resume.service.ts`                                          | `load()` delegates the request and the error mapping to `getBinary()` (D3); behaviour and `ResumeResult` stay the same.                                                                                                                                                                                                                                                                                 | RF-34                      |
| `src/app/core/config/api.ts`, `api.spec.ts`                                        | `isApiUrl(url)`: `true` when `url` parses and its origin equals `API_URL`'s; an invalid URL is `false` (D9). U-API-1…U-API-3.                                                                                                                                                                                                                                                                           | RF-01, RF-02               |
| `src/app/components/certification-card/certification-card.ts`, `.html`, `.spec.ts` | `previewable = computed(() => !!fileUrl && isApiUrl(fileUrl))`. When `previewable`, "View certificate" is a `<button type="button" #viewButton>` with the link's classes and an `fa-eye` icon, calling `preview.open(viewButton)`, and the card hosts `<app-certificate-preview #preview [certification]="cert" />`; otherwise the current new-tab link stays. "Verify" does not change. U-CC-7…U-CC-9. | RF-01, RF-02, RF-04, RF-21 |
| `src/app/core/i18n/messages.en.ts`, `messages.es.ts`                               | New `certificatePreview` block: `close`, `download`, `downloadLabel`, `retry`, `loading`, `page(n, total)`, `errors.notFound`, `errors.generic`, `errors.timeout`, `errors.unsupported`. `resumePreview` gains no keys (`unsupported` is optional in `PreviewTexts`, D1).                                                                                                                               | RF-08, RF-14, RF-28–RF-33  |
| `src/app/core/i18n/messages.spec.ts`                                               | U-M-4…U-M-6, like the `resume preview texts` block.                                                                                                                                                                                                                                                                                                                                                     | RF-28                      |
| `src/styles.css`                                                                   | The scroll lock selector becomes `html:has(dialog.file-preview[open])`, so it covers both dialogs.                                                                                                                                                                                                                                                                                                      | RF-12                      |

### Infrastructure

| File                                                              | Change                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `package.json`, `pnpm-lock.yaml`                                  | No dependency change.                                      |
| `nginx.conf`, `Dockerfile`, `angular.json`, `scripts/`, `docker/` | No change (D6).                                            |
| `package.json` `version`                                          | 4.3.0 → 4.4.0 in `chore(release): Bump version to v4.4.0`. |

## Data model

No persistent data. The only state is in memory:

- `CertificateService`: the `PreviewFile` of each successful load, keyed by `fileUrl`. The API
  serves `/files/:id` as `immutable`, so a URL never changes content while the page is open.
  Failures are not kept, so Retry always reaches the API (RF-32).
- `FilePreview`: the open `PdfDocument` (destroyed on close) or the image's `data:` URL (dropped on
  close).

## Decisions

| #   | Decision                                                                                                                                                                           | Discarded alternative                                                                 | Why                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | A `PreviewSource` object passed to `open()` (title, `lang`, texts, `load`, `fileName`, `renderFailure`), with `PreviewTexts` typed from the shared keys of both dictionary blocks. | One `FilePreview` input per field, or an abstract base class each preview extends.    | `open()` already receives the trigger; passing the source there keeps one entry point and lets `CertificatePreview` read the certification at click time. Inheritance is not used for components anywhere in the repo.                                                                      |
| D2  | Move the dialog, states, PDF loop, download, retry and cancel from `ResumePreview` into `FilePreview`; `ResumePreview` and `CertificatePreview` become thin wrappers.              | Copy `ResumePreview` into a `CertificatePreview` of ~200 lines.                       | The spec asks for the same look and behaviour (Decisions "Look and behaviour"); a copy would drift. The resume specs stay unchanged and guard RF-34; the hero keeps `app-resume-preview` and `open(trigger)`, so nothing outside the component changes.                                     |
| D3  | Extract `getBinary()` (timeout, abort, 404/timeout/generic mapping) used by `ResumeService` and `CertificateService`.                                                              | Duplicate the pipeline in `CertificateService`, or make `ResumeService` generic.      | The mapping is RF-29–RF-31 here and RF-27–RF-30 in Spec 006: the same rule, one place. `ResumeService` keeps its own cache by `lang` and its contract, so U-RS-1…U-RS-9 still apply. `HttpClient` is still injected only by the services (§5).                                              |
| D4  | Tell PDF from image by the response's `Content-Type` (without parameters).                                                                                                         | Sniff the first bytes (`%PDF`, PNG/JPEG/WebP signatures), or trust the URL extension. | The API sniffs every upload and stores the mime it found, so the header is already the sniffed type; `Content-Type` is a CORS-safelisted header readable cross-origin. `/files/:id` URLs have no extension.                                                                                 |
| D5  | Cache by `fileUrl` in the root `CertificateService`.                                                                                                                               | Cache per card component, or rely on the HTTP cache (`immutable`).                    | RF-06 asks for no new request on reopen "in either UI language"; the URL is the identity of the file and does not depend on the language. Each card has its own dialog (D10), but two cards (home and `/experience`) may show the same certificate in one session only through the service. |
| D6  | Show images from a `data:` URL of the loaded bytes (`FileReader.readAsDataURL`).                                                                                                   | A `blob:` object URL, or `<img src="{{ fileUrl }}">` straight from the API.           | `img-src` has `data:` but not `blob:`, and adding it is an infra change (spec Constraints). Pointing `<img>` at the API would be a second load of what Download saves (RF-17) and would not tell a 404 from a broken file. Images are at most 5 MiB on the API, a size `data:` handles.     |
| D7  | Fit images with CSS (`w-full h-auto`), no `ResizeObserver`.                                                                                                                        | Draw the image into a `<canvas>` like the PDF pages.                                  | The browser keeps the aspect ratio and re-fits on resize or rotation by itself (RF-11, RF-13). An `<img>` never runs an SVG's scripts (RF-15) and carries `alt` (RF-14, §8).                                                                                                                |
| D8  | Download name from `certificateFileName()` in `core/utils/`, fallback `certificate`.                                                                                               | A dictionary name, or the name in the API's `Content-Disposition`.                    | The spec chose the certificate's name, the same in both languages (RF-18). `Content-Disposition` is not a CORS-safelisted header and the API does not expose it (out of scope: no `api` change).                                                                                            |
| D9  | `isApiUrl()` compares URL origins next to `API_URL` in `core/config/api.ts`.                                                                                                       | A string `startsWith(API_URL)`.                                                       | `startsWith` accepts `https://api.figueroa-sanchez.com.evil.tld/…` and rejects a default port written out. The origin is what `connect-src` and CORS check (RF-02, RF-35).                                                                                                                  |
| D10 | One `<app-certificate-preview>` inside each card that has an API file, like the hero hosts its `<app-resume-preview>`.                                                             | One shared dialog in the page or the app shell, opened through a service.             | It keeps the card self-contained on the home and `/experience` (RF-01) with no new shared state. A closed native `<dialog>` costs a few nodes; the home shows at most 3 cards.                                                                                                              |
| D11 | Accept every image type the API stores: PNG, JPEG, GIF, WebP and SVG (owner, 2026-10-22: "certificates are stored as PDF or image").                                               | Only PNG, JPEG, WebP and SVG, with GIF as `unsupported`.                              | The API sniffs uploads into exactly these types, so any certificate the owner can upload opens in the preview; RF-11 and RF-18 were updated in T01.                                                                                                                                         |

## RF coverage

| RF                  | Where                                                            | Tests                           |
| ------------------- | ---------------------------------------------------------------- | ------------------------------- |
| RF-01, RF-02        | `CertificationCard.previewable`, `isApiUrl()`                    | U-API-1…U-API-3, U-CC-7, U-CC-8 |
| RF-03               | `CertificatePreview` loads only on `open()`                      | U-CP-1                          |
| RF-04               | card button → `CertificatePreview.open()` → `FilePreview.open()` | U-CC-9, U-FP-1                  |
| RF-05               | `CertificateService.load()`                                      | U-CS-1, U-CP-2                  |
| RF-06               | `CertificateService` cache by URL                                | U-CS-7, U-CS-8                  |
| RF-07               | `PreviewSource.lang` from `itemLang()`, title `[attr.lang]`      | U-CP-3, U-FP-2                  |
| RF-08, RF-09        | `loading` state in `file-preview.html`                           | U-FP-3, U-RP-4                  |
| RF-10               | PDF path moved from `ResumePreview`                              | U-FP-4, U-RP-5                  |
| RF-11               | image path, `data:` URL                                          | U-FP-5, M2                      |
| RF-12               | `styles.css` `:has()` rule, `overscroll-behavior`                | M3 (manual)                     |
| RF-13               | `ResizeObserver` (PDF), CSS (image)                              | U-RP-6, M3                      |
| RF-14               | canvas `aria-label`, `<img alt>`                                 | U-FP-4, U-FP-5                  |
| RF-15               | `PdfRendererService` options (plan 006 D9), `<img>` for SVG      | U-PR-2, U-FP-5                  |
| RF-16               | `PDFJS_LOADER`, image path does not call the renderer            | U-FP-6, build stats (M6)        |
| RF-17, RF-19        | `FilePreview.download()`                                         | U-FP-7                          |
| RF-18               | `certificateFileName()`                                          | U-FN-1…U-FN-4, U-CP-4           |
| RF-20, RF-21        | `close()`, backdrop, Escape, `onClosed()`                        | U-RP-8, U-CC-9, M4              |
| RF-22               | `getBinary()` abort + generation counter                         | U-BR-4, U-CS-9, U-FP-8          |
| RF-23, RF-24, RF-25 | `<dialog>` + `showModal()`, `aria-labelledby` the title          | U-FP-2, U-RP-10, M4             |
| RF-26, RF-27        | Tailwind classes moved from `resume-preview.html`                | M3                              |
| RF-28               | `certificatePreview` in `messages.*.ts`                          | U-M-4, U-M-5                    |
| RF-29               | 404 → `not-found` → `errors.notFound`                            | U-BR-1, U-CS-3, U-FP-9          |
| RF-30               | `generic` → `errors.generic`                                     | U-BR-2, U-CS-4, U-FP-9          |
| RF-31               | `FILE_TIMEOUT_MS` → `timeout`                                    | U-BR-3, U-CS-5, U-FP-9          |
| RF-32               | `retry()` for `not-found`, `generic`, `timeout`                  | U-CS-10, U-FP-10                |
| RF-33               | `unsupported` from the service or `renderFailure`, no Retry      | U-CS-6, U-FP-11, U-FP-12        |
| RF-34               | `ResumePreview` wrapper, `ResumeService` over `getBinary()`      | U-RP-1…U-RP-16, U-RS-1…U-RS-9   |
| RF-35               | D6, `connect-src` `API_URL` only                                 | M5                              |

## Test strategy

Unit tests with Vitest and jsdom, without network: `HttpTestingController` for the API, the fake
`PdfRendererService`, `FakeResizeObserver` and the `showModal()`/`close()` emulation already in
`resume-preview.spec.ts` (moved to a shared test helper only if both specs need it). There is no
e2e suite; the browser-only parts are the manual checks M1–M6.

**`getBinary()` (U-BR):**

- U-BR-1 — 404 → `{ ok: false, reason: 'not-found' }`.
- U-BR-2 — 400, 500, 503 and a network/CORS failure (status 0) → `generic`; the body is never returned.
- U-BR-3 — No answer in `FILE_TIMEOUT_MS` (fake timers) → `timeout`, and the request is cancelled.
- U-BR-4 — Aborting the signal cancels the request (`req.cancelled`) and resolves `generic`.
- U-BR-5 — A 200 resolves with the body and the response headers.

**`CertificateService` (U-CS):**

- U-CS-1 — `load(url)` sends `GET url` with no `lang` (or any) param and `arraybuffer`.
- U-CS-2 — `application/pdf` → `{ kind: 'pdf' }`; `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml` (also with `; charset=…`) → `{ kind: 'image', mime }`, with the same bytes.
- U-CS-3 — 404 → `not-found`.
- U-CS-4 — 500 and status 0 → `generic`.
- U-CS-5 — Timeout → `timeout`.
- U-CS-6 — `text/html`, `application/octet-stream`, `image/bmp` and a missing `Content-Type` → `unsupported`, not cached.
- U-CS-7 — A second `load(url)` after a success answers from the cache (`expectNone`).
- U-CS-8 — Another URL sends its own request.
- U-CS-9 — Aborting cancels the request and caches nothing.
- U-CS-10 — After a failure, a new `load()` sends a new request.

**`FilePreview` (U-FP):**

- U-FP-1 — `open(trigger, source)` shows the dialog and calls `source.load()` with a signal.
- U-FP-2 — The title shows `source.title`, has `lang` only when `source.lang` is set, and labels the dialog (`aria-labelledby`).
- U-FP-3 — While loading: `role="status"` with `texts.loading`, Download disabled.
- U-FP-4 — A `pdf` file draws its pages into labelled canvases, as U-RP-5.
- U-FP-5 — An `image` file shows one `<img>` with a `data:<mime>;base64,` `src`, `alt` = title, no canvas; Download enabled.
- U-FP-6 — An `image` file never calls `PdfRendererService.open()`.
- U-FP-7 — Download saves the loaded bytes with `source.fileName(file)` and the file's mime, and the dialog stays open.
- U-FP-8 — Closing while loading aborts the signal and ignores a late result (PDF and image).
- U-FP-9 — `not-found`, `generic` and `timeout` show their `texts.errors` text in `role="alert"`.
- U-FP-10 — For those three, Retry is shown and calls `load()` again.
- U-FP-11 — `unsupported` shows `texts.errors.unsupported`, Close and no Retry.
- U-FP-12 — A renderer rejection or an `<img>` `error` event shows `source.renderFailure` (`unsupported` → no Retry; `generic` → Retry).

**`CertificatePreview` (U-CP), card (U-CC), utils (U-FN, U-API) and dictionaries (U-M):**

- U-CP-1 — Created without opening (as in prerendering or SSR): `CertificateService.load()` is not called.
- U-CP-2 — `open()` loads the certification's `fileUrl`.
- U-CP-3 — An English certification on `/es` gives the title `lang="en"`; a Spanish one, none.
- U-CP-4 — The download name is `certificateFileName(name, mime)` on `/` and on `/es`.
- U-CC-7 — An API file renders "View certificate" as a `<button>` (no `href`, no `target`) and hosts the preview.
- U-CC-8 — A `fileUrl` on another origin keeps the new-tab link and no preview.
- U-CC-9 — Clicking the button opens the preview with that button as trigger.
- U-FN-1 — `('AWS Certified Cloud Practitioner', 'application/pdf')` → `aws-certified-cloud-practitioner.pdf`.
- U-FN-2 — Accents and symbols: `('Certificación — Ñandú & Co.', 'image/jpeg')` → `certificacion-nandu-co.jpg`.
- U-FN-3 — Each supported mime gets its extension (`png`, `gif`, `webp`, `svg`).
- U-FN-4 — A name with no Latin letters or digits → `certificate.<ext>`.
- U-API-1 — A URL on `API_URL`'s origin → `true`, also with a path and a query.
- U-API-2 — Another host, a lookalike host (`api.example.com.evil.tld`), another scheme or port → `false`.
- U-API-3 — A relative or invalid URL → `false`.
- U-M-4 — `certificatePreview` has the same keys in English and Spanish.
- U-M-5 — No blank text, and `page(2, 3)` reads "Page 2 of 3" / "Página 2 de 3".
- U-M-6 — `certificatePreview.errors.unsupported` exists in both languages.

**Not covered by unit tests** (jsdom has no canvas, image decoding, layout or CSP):

- M1 — Local API: a PDF certificate and an image certificate open from the home and from `/experience`, on `/` and `/es`; reopening sends no request (devtools Network).
- M2 — An SVG and a large JPEG/PNG render fitted and sharp; Download saves `<kebab-name>.<ext>` and the file opens.
- M3 — 1280 px and 375 px: centered vs full screen, header visible while scrolling, page behind does not scroll, rotation re-fits.
- M4 — Keyboard only: Tab stays in the dialog, Escape closes, focus back on "View certificate".
- M5 — Docker `static` and `ssr` images: no CSP violation in the console for a PDF and an image; a certificate with an external `fileUrl` opens in a new tab.
- M6 — Build stats: pdf.js stays a lazy chunk; the initial total stays under 500 kB. The resume preview behaves as before (open, download, errors).

## Implementation order

1. `getBinary()` with its spec; `ResumeService` over it (U-RS-* still green).
2. `file-preview.ts` interfaces; `CertificateService` with its spec.
3. `isApiUrl()` and `certificateFileName()` with their specs.
4. Dictionaries: `certificatePreview` block and `messages.spec.ts`.
5. `FilePreview` (moved from `ResumePreview`, plus the image path and `unsupported`); `ResumePreview` as a wrapper; `styles.css` selector. Run `resume-preview.spec.ts` unchanged before going on (RF-34).
6. `CertificatePreview` and its spec; `CertificationCard` button and preview, with its spec.
7. `pnpm test --watch=false`, `pnpm build`, `scripts/check-ssr-csp.sh`, `pnpm exec prettier --check`; manual checks M1–M6.
8. `chore(release): Bump version to v4.4.0`.

## Release

1. **Before merging:** in production, make sure the certifications whose file should open in the preview have a `fileUrl` on `https://api.figueroa-sanchez.com/files/…` (panel). Others keep opening in a new tab.
2. Check that `https://marco.figueroa-sanchez.com` is enabled in the API's `cors_origin` table (already true for content reads and the resume).
3. Merge into `main`; `test.yaml` passes and `release.yaml` publishes and pins both images.
4. After `rollout status`: on `/` and `/experience`, and under `/es`, open a PDF and an image certificate with the console open (no CSP or CORS errors), download one, and open the resume once.
5. Rollback: revert the release; certificates go back to opening in a new tab.

## Risks

- **Moving the resume logic (RF-34):** a subtle change in timing (focus, next-frame draw) can break the resume preview. Mitigation: step 5 keeps `resume-preview.spec.ts` unchanged as the regression net, and M6 checks the resume by hand.
- **SVG with external references:** an SVG shown through `<img>` cannot load external images or fonts, so such a certificate may look incomplete. Impact: missing parts, no error. Mitigation: check in M2; the API's upload sniffing accepts SVG as is, so the owner should upload self-contained SVGs or a PDF/PNG.
- **Large images as `data:` URLs:** a 5 MiB image becomes ~6.7 MiB of base64 in memory. Impact: a short delay on old phones. Mitigation: acceptable within the API's limit; checked in M2 on a phone.
- **PDF features needing extra files:** as in plan 006, non-embedded fonts or JPEG 2000 images in a certificate PDF make pdf.js fetch data it cannot get. Impact: wrong glyphs or `unsupported`. Mitigation: M1 with the real certificates; the visitor can still use "Verify".
- **Certificates not on the API at release:** they keep the new-tab link (RF-02), so nothing breaks; release step 1 moves the ones the owner wants previewed.
