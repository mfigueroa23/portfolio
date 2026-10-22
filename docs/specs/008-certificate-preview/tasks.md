# Tasks 008 — Certificate preview

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Order:** by dependency. A task starts only when the tasks under "Depends on" are done. Tasks with the same dependencies can run in parallel.
- **Ids:** `D#` = plan decision, `U-*` = unit tests and `M#` = manual checks listed in the plan's test strategy.
- **Approvals:** the spec and the plan were approved on 2026-10-22. No dependency, infra, `angular.json` or SSR route change is planned; if T11 finds a CSP violation, any `nginx.conf` change needs a new approval (D6).

## Phase 0 — Gate

- [x] **T01 — Close the plan's open questions**
  - **RF:** RF-11, RF-33
  - **Depends on:** —
  - **Scope:**
    - Ask the owner whether `image/gif` joins the supported images (D11). If yes, add GIF to RF-11, RF-18 (`.gif`) and the spec's Decisions, and update D11, U-CS-2, U-CS-6 and U-FN-3 in the plan; if no, leave both as they are.
    - Set `Status: Approved` in `spec.md` and `plan.md`, as in Specs 006 and 007.
  - **Done when:** the answer about GIF is written in D11, and `grep -n 'Status' docs/specs/008-certificate-preview/{spec,plan}.md` shows `Approved` in both.
  - Done on 2026-10-22: the owner said certificates are stored as PDF or image, so GIF joins the supported images (RF-11, RF-18, D11); spec and plan are `Approved`.

## Phase 1 — Foundations

- [x] **T02 — Shared binary request: `getBinary()` and `ResumeService` over it**
  - **RF:** RF-22, RF-29, RF-30, RF-31, RF-34
  - **Depends on:** T01 (can run in parallel with T04 and T05)
  - **Scope:**
    - `core/services/binary-request.ts`: `getBinary(http, url, options, signal)` with the `timeout(FILE_TIMEOUT_MS)` + `takeUntil(abort)` pipeline and the 404 → `not-found`, `TimeoutError` → `timeout`, anything else → `generic` mapping, resolving with the body and the response headers (D3). `FILE_TIMEOUT_MS` = 30 s.
    - `resume.service.ts`: `load()` delegates to `getBinary()`; `RESUME_TIMEOUT_MS` stays exported as an alias; `ResumeResult` and the cache by `lang` do not change.
    - `binary-request.spec.ts` with `HttpTestingController`.
  - **Done when:** U-BR-1…U-BR-5 pass, and U-RS-1…U-RS-9 pass with `resume.service.spec.ts` unchanged.

- [x] **T03 — Preview types and `CertificateService`**
  - **RF:** RF-05, RF-06, RF-22, RF-29, RF-30, RF-31, RF-32, RF-33
  - **Depends on:** T02
  - **Scope:**
    - `core/interfaces/file-preview.ts`: `PreviewFile`, `PreviewFailure` (with `unsupported`), `PreviewResult`, `PreviewTexts` (shared keys of both dictionary blocks, `errors.unsupported` optional) and `PreviewSource` (D1).
    - `core/services/certificate.service.ts`: `load(fileUrl, signal)` through `getBinary()` with no params and `observe: 'response'`; type from `Content-Type` without parameters (D4): `application/pdf` → `pdf`; PNG, JPEG, WebP, SVG GIF → `image`; anything else → `unsupported` (D11). Successful loads cached by URL, failures not cached (D5).
    - `certificate.service.spec.ts`.
  - **Done when:** U-CS-1…U-CS-10 pass.

- [x] **T04 — URL and file name utils: `isApiUrl()` and `certificateFileName()`**
  - **RF:** RF-01, RF-02, RF-18
  - **Depends on:** T01 (can run in parallel with T02 and T05)
  - **Scope:**
    - `core/config/api.ts`: `isApiUrl(url)` comparing parsed origins with `API_URL`; invalid or relative URLs are `false` (D9). Cases in `api.spec.ts`.
    - `core/utils/file-name.ts`: `certificateFileName(name, mime)` (NFD, no diacritics, lowercase, non-alphanumeric runs → `-`, trimmed, extension per mime, fallback `certificate`) (D8). `file-name.spec.ts`.
  - **Done when:** U-API-1…U-API-3 and U-FN-1…U-FN-4 pass.

- [x] **T05 — Dictionary texts: `certificatePreview`**
  - **RF:** RF-08, RF-14, RF-28, RF-29, RF-30, RF-31, RF-33
  - **Depends on:** T01 (can run in parallel with T02 and T04)
  - **Scope:**
    - `messages.en.ts` / `messages.es.ts`: the `certificatePreview` block (`close`, `download`, `downloadLabel`, `retry`, `loading`, `page(n, total)`, `errors.notFound|generic|timeout|unsupported`). `resumePreview` gains no keys.
    - `messages.spec.ts`: a `certificate preview texts` block like the resume one.
  - **Done when:** U-M-4…U-M-6 pass and `pnpm build` succeeds.

## Phase 2 — Preview dialog

- [x] **T06 — Shared dialog: `components/file-preview/` and `ResumePreview` as a wrapper**
  - **RF:** RF-04, RF-07–RF-17, RF-19, RF-20, RF-22–RF-27, RF-29–RF-34
  - **Depends on:** T02, T03, T05
  - **Scope:**
    - `file-preview.ts` / `.html` / `.spec.ts`, selector `app-file-preview`: move the dialog, states, PDF loop (`ResizeObserver`, next-frame draw), download, retry and cancel from `ResumePreview` (D2); `open(trigger, source)` (D1); title from `source.title` with `[attr.lang]`; texts from `source.texts`; the image path with a `data:` URL in an `<img>` fitted with `w-full h-auto` and `alt` = title (D6, D7); `unsupported` without Retry; renderer rejection or `<img>` `error` → `source.renderFailure`. Dialog class `file-preview`.
    - `resume-preview.ts` / `.html`: a wrapper over `<app-file-preview>` with the same selector and `open(trigger)`, `renderFailure: 'generic'`.
    - `src/styles.css`: the scroll lock selector becomes `html:has(dialog.file-preview[open])`.
    - No component CSS file unless needed (4 kB budget).
  - **Done when:** U-FP-1…U-FP-12 pass; U-RP-1…U-RP-16 pass with `resume-preview.spec.ts` unchanged except for imports or helpers (RF-34); U-PR-1…U-PR-6 still pass; `pnpm build` has no `anyComponentStyle` warning.

- [x] **T07 — Certificate wrapper: `components/certificate-preview/`**
  - **RF:** RF-03, RF-04, RF-05, RF-07, RF-18
  - **Depends on:** T03, T04, T05, T06
  - **Scope:** `certificate-preview.ts` / `.html` / `.spec.ts`, selector `app-certificate-preview`: `certification` input; `open(trigger)` builds the `PreviewSource` (title `name`, `lang` from `LanguageService.itemLang()`, texts `m().certificatePreview`, `load` from `CertificateService`, `fileName` from `certificateFileName()`, `renderFailure: 'unsupported'`) and opens the inner `<app-file-preview>`.
  - **Done when:** U-CP-1…U-CP-4 pass.

## Phase 3 — Integration with the site

- [x] **T08 — Certification card: "View certificate" opens the preview**
  - **RF:** RF-01, RF-02, RF-04, RF-16, RF-21
  - **Depends on:** T07
  - **Scope:** `certification-card.ts` / `.html` / `.spec.ts`: `previewable` from `isApiUrl(fileUrl)`; when true, a `<button type="button" #viewButton>` with the link's classes and `fa-eye`, calling `preview.open(viewButton)`, plus `<app-certificate-preview #preview [certification]="cert" />` (D10); otherwise the current new-tab link. "Verify" unchanged.
  - **Done when:** U-CC-7…U-CC-9 pass, U-CC-1…U-CC-6 still pass (the existing new-tab case uses a non-API URL or moves to U-CC-8), and `pnpm build` lists pdf.js only as a lazy chunk with the initial total under 500 kB.

## Phase 4 — Verification and release

- [x] **T09 — Quality gate**
  - **RF:** —
  - **Depends on:** T08
  - **Scope:** the closing commands from `AGENTS.md`.
  - **Done when:** `pnpm test --watch=false` passes (all U-BR, U-CS, U-API, U-FN, U-M, U-FP, U-RP, U-RS, U-PR, U-CP and U-CC cases included), `pnpm build` ends with no errors or exceeded budgets, `scripts/check-ssr-csp.sh` prints that the CSP covers every inline script, and `pnpm exec prettier --check` is clean on every file this branch touches.
  - Run on 2026-10-22: 62 files and 596 tests pass; the build has no budget warning (initial total 393.51 kB, pdf.js a 433.62 kB lazy chunk); the CSP check prints that the generated CSP covers every inline script; `prettier --check` is clean on every file changed since `main`.

- [x] **T10 — Manual checks against the local API**
  - **RF:** RF-06, RF-10–RF-13, RF-15, RF-17, RF-18, RF-20, RF-21, RF-23–RF-27, RF-32, RF-34
  - **Depends on:** T09
  - **Scope:** `api` running locally with a PDF certificate and an image certificate (PNG or JPEG, plus one SVG and one GIF) whose `fileUrl` is on the local API, and one certificate with an external `fileUrl`; `pnpm start` against it. Record the results in this file under T10, as in Spec 006's T08.
  - **Done when:** M1–M4 are recorded as passed: PDF and image from the home and `/experience`, on `/` and `/es`, with no request on reopen (M1); SVG and large image fitted, download names `<kebab-name>.<ext>` (M2); 1280 px / 375 px layout, scroll lock and rotation (M3); keyboard only, Escape and focus return to "View certificate" (M4); plus 404 and Retry after stopping the API, and the resume preview behaving as before.
  - Run on 2026-10-22 together with T11, in a headless Chromium driven over CDP against the Docker `static` and `ssr` images built with the production `API_URL` and run in one network namespace, as in the pod (nginx proxying the SSR routes to `127.0.0.1:4000`). A small local proxy gave nginx the production `Host` its `server_name` needs. The page content came from the production API. The local run is not on the site's origin, so the browser's API requests were answered through CDP with the CORS headers the API sends to the real site. Certificate files came from the local `api`, which holds the same bytes; a PNG, an SVG (with a `<script>`), a tall SVG and a GIF were served in place of four of them, and a 404, a `text/html` answer and a request never answered were produced the same way. Downloads were caught through the browser's download events. 39/39 checks pass:
    - [x] Home: the 3 cards show "View certificate" as a button and no file link; `/experience` shows 5 (M1, RF-01).
    - [x] A real mouse click and a script click open a modal dialog without changing the URL, labelled by the certificate name, with focus on Close (RF-04, RF-23, RF-24).
    - [x] The PDF draws fitted to the width (718 px in a 766 px area with its padding), labelled "Page 1 of 1"; reopening sends no new request (M1, RF-06, RF-10, RF-14).
    - [x] PNG fitted to the width with its ratio and `alt` = the name; SVG shown with its script not run; GIF shown (M2, RF-11, RF-14, RF-15).
    - [x] Downloads save `data-analytics.pdf`, `advanced-programming.png`, `it-support.svg` and `basic-software-design.gif` with no new request, and the dialog stays open (M2, RF-17–RF-19).
    - [x] 1280 × 800: a 768 × 720 px window centered over the page, which does not scroll (`overflow: hidden`); 375 × 812: full screen, with Download and Close at the top after scrolling a tall image 400 px; rotating to 812 × 375 refits the PDF (M3, RF-12, RF-13, RF-26, RF-27).
    - [x] Keyboard: Tab never reaches the page behind; Escape, the close control and a click outside close it, and focus returns to "View certificate" (M4, RF-20, RF-21, RF-25).
    - [x] A 404 shows "This certificate is not available right now." with Retry and Download disabled, and Retry draws the PDF; a `text/html` file shows "can't be shown here" with no Retry; no answer shows the timeout text after 30 s (RF-29, RF-31–RF-33).
    - [x] `/es`: "Ver certificado", "Cerrar certificado", "Página 1 de 1"; a certification translated to Spanish has no `lang`; the same file is requested in both languages, once per page load (RF-05–RF-07, RF-28).
    - [x] The resume preview still draws the resume and downloads `Marco-Figueroa-Resume.pdf` (RF-34).
    - [ ] **Open question (RF-18):** the owner translated the certification names, so `/es` downloads `analitica-de-datos.pdf` while `/` downloads `data-analytics.pdf`. The site only gets the name in the page language, so RF-18's "the same in both UI languages" cannot hold for a translated name. Asked to the owner: keep the name shown on the page (and reword RF-18), or name the file another way.
    - [ ] **Open question (RF-31):** the production API sends these files at about 80–200 KB/s from this network: a 4 MB certificate PDF took 20 s and 50 s in two downloads, against 0.1 s from the local API. With the 30 s timeout, a large certificate may show the timeout text in production. Asked to the owner whether to raise the timeout for certificates, shrink the PDFs, or look at the API's throughput.
    - [ ] A real phone, Firefox and Safari, and a screen reader. Only Chromium was available headless.

- [x] **T11 — Built site and CSP check in the Docker images**
  - **RF:** RF-16, RF-35
  - **Depends on:** T09 (can run in parallel with T10)
  - **Scope:** `docker build --target static .` and `docker build --target ssr .` with local `API_URL`; open a PDF and an image certificate with the console open, on the home and on `/experience`.
  - **Done when:** M5 (no CSP violation for a PDF and an image; an external `fileUrl` opens in a new tab) and M6 (pdf.js loads only on the first PDF open, initial total under 500 kB, resume preview unchanged) are recorded as passed. If a CSP violation appears, stop and ask for approval before touching `nginx.conf` (D6).
  - Run on 2026-10-22 with the T10 run: both images build with `API_URL=https://api.figueroa-sanchez.com`. The pages kept the image's own CSP, minus `upgrade-insecure-requests` because the local run is plain HTTP. No CSP violation or CSP console error in the whole run, with PDFs and PNG, SVG and GIF images shown from `data:` URLs (M5, RF-35, D6), so `nginx.conf` does not change. A `fileUrl` on another origin (`https://cdn.example.com/…`) is a new-tab link with `rel="noopener noreferrer"` and no preview (M5, RF-02). Opening an image loads neither pdf.js nor its worker, and the first PDF open loads `worker-*.js` (M6, RF-16); the initial total is 393.51 kB (T09) and the resume preview is unchanged (T10).

- [ ] **T12 — Version bump**
  - **RF:** —
  - **Depends on:** T10, T11
  - **Scope:** `package.json` `version` 4.3.0 → 4.4.0 (feat → minor).
  - **Done when:** a `chore(release): Bump version to v4.4.0` commit changes only `version`, and `pnpm build` still passes.

- [ ] **T13 — Production check after deploy**
  - **RF:** RF-02, RF-35
  - **Depends on:** T12, and the merge into `main` with `release.yaml` finished
  - **Scope:** the plan's release steps 1, 2 and 4: before merging, the certifications to preview have a `fileUrl` on `https://api.figueroa-sanchez.com/files/…` and the site's origin is enabled in `cors_origin`.
  - **Done when:** before merging, `curl -sI <a certificate fileUrl>` answers 200 with `Content-Type: application/pdf` or an image type; after `rollout status`, a PDF and an image certificate open on `/` and `/es` (home and `/experience`) with no CORS or CSP error in the console, one download saves the expected name, and the resume preview still opens.

## RF → tasks

| RF    | Tasks              |
| ----- | ------------------ |
| RF-01 | T04, T08           |
| RF-02 | T04, T08, T13      |
| RF-03 | T07                |
| RF-04 | T06, T07, T08      |
| RF-05 | T03, T07           |
| RF-06 | T03, T10           |
| RF-07 | T06, T07           |
| RF-08 | T05, T06           |
| RF-09 | T06                |
| RF-10 | T06, T10           |
| RF-11 | T01, T06, T10      |
| RF-12 | T06, T10           |
| RF-13 | T06, T10           |
| RF-14 | T05, T06           |
| RF-15 | T06, T10           |
| RF-16 | T06, T08, T11      |
| RF-17 | T06, T10           |
| RF-18 | T04, T07, T10      |
| RF-19 | T06                |
| RF-20 | T06, T10           |
| RF-21 | T08, T10           |
| RF-22 | T02, T03, T06      |
| RF-23 | T06, T10           |
| RF-24 | T06, T10           |
| RF-25 | T06, T10           |
| RF-26 | T06, T10           |
| RF-27 | T06, T10           |
| RF-28 | T05                |
| RF-29 | T02, T03, T05, T06 |
| RF-30 | T02, T03, T05, T06 |
| RF-31 | T02, T03, T05, T06 |
| RF-32 | T03, T06, T10      |
| RF-33 | T01, T03, T05, T06 |
| RF-34 | T02, T06, T10      |
| RF-35 | T11, T13           |
