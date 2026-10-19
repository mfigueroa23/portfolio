# Spec 006 — Resume preview

- **Status:** Approved
- **Date:** 2026-10-18
- **Scope:** `web` only (consumes `GET /resume` from `api` 6.1.0, Spec 005)

## Why

The hero's "Download Resume" button links to a PDF copied into `public/`. Each new resume needs a
new web release, the Spanish site serves the same English file, and visitors must download a file
before they can even glance at it. The API now keeps the current resume per language behind one
stable URL (`GET /resume?lang=en|es`, Spec 005), so the site can stop shipping its own copy.

Visitors and recruiters want to look at the resume first and decide whether to keep it. They
should be able to read it on the same page, in the language they are browsing, and then download
it or close it and go on browsing.

## Decisions

| Topic            | Decision                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source           | The resume comes only from `GET {API_URL}/resume?lang=<UI language>`. The static `public/Marco-Figueroa-Resume.pdf` is removed and there is no fallback copy.                                                                  |
| Entry point      | The hero's resume button opens the preview instead of linking to the PDF; its label becomes "View Resume" / "Ver CV". No other entry point.                                                                                    |
| Renderer         | The PDF is drawn by the site itself (pdf.js, a new dependency), the same on desktop and mobile, instead of the browser's built-in viewer, which does not render embedded PDFs on Android and shows only the first page on iOS. |
| Viewer controls  | Vertical scroll through every page, fitted to the dialog width. No zoom, pagination or toolbar.                                                                                                                                |
| Download         | Saves the bytes already loaded for the preview, with no second request, under a fixed file name per language from the dictionaries.                                                                                            |
| Spanish fallback | When no Spanish resume is assigned, the API serves English; the preview shows it without any notice.                                                                                                                           |
| Errors           | The dictionary's text with Retry and Close. No fallback to a static PDF.                                                                                                                                                       |
| Reopening        | The loaded PDF is reused while the page stays open and the language does not change.                                                                                                                                           |

## Functional requirements

"The site" is this Angular app in the browser. "Visitor" is anyone browsing it. "UI language" is
`en` (root) or `es` (under `/es`). "The preview" is the resume dialog. "Resume button" is the
hero's resume call to action.

### Opening the preview

- **RF-01** — The site shall show the resume button in the hero, in English and under `/es`, labelled from the dictionary as "View Resume" / "Ver CV".
- **RF-02** — The site shall not request the resume during prerendering or server rendering.
- **RF-03** — When the visitor activates the resume button, the site shall open the preview as a modal dialog over the current page, without navigating or changing the URL.
- **RF-04** — When the preview opens with no resume loaded for the UI language, the site shall request `GET {API_URL}/resume?lang=<UI language>`.
- **RF-05** — When the visitor reopens the preview while a resume for the UI language is already loaded, the site shall show it again without a new request.
- **RF-06** — While the resume is loading, the preview shall show a loading indicator with an accessible text from the dictionary.
- **RF-07** — While no resume is rendered, the preview shall keep the Download control disabled.

### Rendering

- **RF-08** — When the resume has loaded, the preview shall render every page in order, stacked vertically, each fitted to the dialog's width.
- **RF-09** — While the pages are taller than the dialog, the preview shall scroll them inside the dialog, and the page behind shall not scroll.
- **RF-10** — When the dialog's width changes (resize or rotation), the preview shall fit the pages to the new width.
- **RF-11** — The preview shall give each rendered page an accessible label with its number and the total, from the dictionary.
- **RF-12** — The preview shall render the PDF as static content. It shall not run scripts or forms embedded in the PDF.
- **RF-13** — When the API serves the English resume for a Spanish request (fallback), the preview shall show it like any other resume, without an error or notice.
- **RF-14** — The site shall load the PDF renderer only when the preview is first opened. The initial bundle shall not include it.

### Download

- **RF-15** — When the visitor activates Download, the site shall save the resume already loaded in the preview, without a new request to the API.
- **RF-16** — The site shall name the saved file from the dictionary of the UI language: `Marco-Figueroa-Resume.pdf` in English and `Marco-Figueroa-CV.pdf` in Spanish.
- **RF-17** — When the download starts, the preview shall stay open.

### Closing

- **RF-18** — When the visitor activates Close, presses Escape or clicks outside the dialog, the site shall close the preview.
- **RF-19** — When the preview closes, the site shall return focus to the resume button.
- **RF-20** — If the preview is closed while the resume is still loading, then the site shall cancel the request and the rendering, and shall not reopen or show anything later.

### Layout and accessibility

- **RF-21** — The preview shall be exposed as a labelled modal dialog. Every control shall have an accessible name and a visible focus.
- **RF-22** — When the preview opens, the site shall move focus into the dialog.
- **RF-23** — While the preview is open, keyboard focus shall stay inside the dialog.
- **RF-24** — Where the viewport is at least the `md` breakpoint, the preview shall be a centered dialog over a dimmed page.
- **RF-25** — Where the viewport is narrower than `md`, the preview shall take the full screen, and Download and Close shall stay visible while the pages scroll.
- **RF-26** — All preview text (button label, title, loading, page labels, errors, Retry, Download, Close, file names) shall exist in `messages.en.ts` and `messages.es.ts`.

### Errors

- **RF-27** — If the API answers 404 (no resume assigned), then the preview shall show the dictionary's "resume not available" text in the UI language.
- **RF-28** — If the request fails for any other reason (another status, network or CORS failure), then the preview shall show the dictionary's generic error text. It shall never show raw bodies or stack traces.
- **RF-29** — If the response cannot be rendered as a PDF, then the preview shall show the dictionary's generic error text.
- **RF-30** — If no response arrives within 30 seconds, then the site shall abort the request and show the dictionary's timeout text.
- **RF-31** — When an error is shown, the preview shall offer Retry, which repeats the request for the UI language, and keep Close available.

### Integration with the existing site

- **RF-32** — The site shall no longer publish `/Marco-Figueroa-Resume.pdf`, and no page shall link to it.
- **RF-33** — The Content Security Policy of the static and SSR responses shall let the preview work without adding any origin other than `'self'` and the `API_URL` origin, and opening the preview shall log no CSP violation.

## Out of scope

- Zoom, pagination, a page counter, print, text selection, search and clickable links inside the PDF (the visitor chose scroll only).
- The browser's built-in PDF viewer, and opening the resume in a new tab.
- Keeping `public/Marco-Figueroa-Resume.pdf`, or using it as a fallback when the API fails.
- A resume entry point other than the hero (navigation bar, footer, assistant).
- A URL or query parameter that opens the preview directly (deep link).
- Telling the visitor that the Spanish resume fell back to English.
- Any `api` change: using the library file name from `Content-Disposition`, a download parameter, or new CORS exposed headers.
- Managing which PDF is the resume (the `panel` repo) and download statistics.

## Constraints

- **Dependency (needs approval):** `pdfjs-dist` (constitution §1). It is loaded with a dynamic `import()` only, so the initial bundle stays under 500 kB (§3).
- **Infra (needs approval):** the nginx CSP must allow the renderer's worker from `'self'`, and `scripts/check-ssr-csp.sh` must keep passing. Serving the worker file may require an `angular.json` asset entry, which also needs approval.
- **Personal content (needs approval):** deleting `public/Marco-Figueroa-Resume.pdf`.
- **API, before release:** an English resume must be assigned in production (`PUT /resume/assignments/en`, step 3 of the `api` 6.1.0 release order), otherwise the preview answers "not available". The web origin must be enabled in the API's `cors_origin` table (already true for content reads).
- **Constitution:** the request goes through a service in `core/services/` (§5); errors only show dictionary text (§7); semantic HTML and visible focus (§8); nothing in `src/app/` runs on the server for this feature (§2).

## Done criteria

- [ ] Every RF has a unit test where it is logic (service with `HttpTestingController`: 200, 404, other errors, timeout, cancel on close, reuse on reopen; dialog: open, close, focus return, Download, Retry) or a manual check where it is visual.
- [ ] `pnpm test --watch=false`, `pnpm build` (no exceeded budgets, renderer outside the initial bundle) and `scripts/check-ssr-csp.sh` pass.
- [ ] `pnpm exec prettier --check` is clean on the touched files.
- [ ] `version` in `package.json` is bumped as a minor (feat) in `chore(release): Bump version to vX.Y.Z`.
- [ ] Manual check against the local API with resumes assigned: open in EN and under `/es` (and `/es` with only English assigned), scroll a multi-page PDF, download and check the file name, close with Escape, the close control and the backdrop, 404 with no resume, Retry after stopping the API; at 1280 px and 375 px, keyboard only, and with no CSP errors in the console of the Docker `static` image.
