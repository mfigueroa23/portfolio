# Spec 008 — Certificate preview

- **Status:** Approved
- **Date:** 2026-10-22
- **Scope:** `web` only (consumes the certification `fileUrl` already returned by `GET /content/certifications`; no API change)

## Why

The "View certificate" link on certification cards (home and `/experience`) opens the file in a new
tab. Visitors leave the site, mobile browsers handle embedded PDFs poorly, and the experience is
different from the resume, which opens in its own preview dialog (Spec 006) where it can be read,
downloaded or closed without leaving the page.

Visitors and recruiters should be able to look at a certificate the same way they look at the
resume. Unlike the resume, each certificate is issued in a single language, so there is no
per-language version to pick: the same file is shown under `/` and `/es`.

## Decisions

| Topic              | Decision                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look and behaviour | Same as the resume preview (Spec 006): modal dialog, vertical scroll fitted to the width, Download and Close, same layout on desktop and phones. The resume preview keeps its behaviour. |
| Formats            | PDF (drawn by the site, like the resume) and images (PNG, JPEG, GIF, WebP, SVG, the types the API stores), told apart by the response's content type.                                    |
| Source             | Only a `fileUrl` on the `API_URL` origin opens the preview. Any other origin keeps opening in a new tab, as today.                                                                       |
| Language           | One file per certificate; it is requested as is, with no language parameter, and is the same under `/` and `/es`. The dialog's controls follow the UI language.                          |
| Download           | Saves the bytes already loaded, named after the certificate (kebab-case name plus the file's extension), the same in both languages.                                                     |
| Errors             | The dictionary's text with Retry and Close, like the resume. An unsupported file type shows no Retry. No "open in a new tab" fallback.                                                   |
| Reopening          | A loaded certificate is reused while the page stays open.                                                                                                                                |
| Entry points       | The "View certificate" link of every certification card (home and `/experience`). "Verify" keeps opening in a new tab.                                                                   |

## Functional requirements

"The site" is this Angular app in the browser. "Visitor" is anyone browsing it. "UI language" is
`en` (root) or `es` (under `/es`). "The preview" is the certificate dialog. "The card" is a
certification card on the home or on `/experience`. "API file" is a certification whose `fileUrl`
has the same origin as `API_URL`.

### Opening the preview

- **RF-01** — Where a certification has an API file, the card shall show "View certificate" / "Ver certificado" as a button that opens the preview.
- **RF-02** — Where a certification has a `fileUrl` on another origin, the card shall keep "View certificate" as a link that opens it in a new tab.
- **RF-03** — The site shall not request any certificate file during prerendering or server rendering.
- **RF-04** — When the visitor activates "View certificate" on an API file, the site shall open the preview as a modal dialog over the current page, without navigating or changing the URL.
- **RF-05** — When the preview opens for a certificate that is not loaded yet, the site shall request its `fileUrl` with no language parameter.
- **RF-06** — When the visitor reopens the preview of a certificate already loaded, the site shall show it again without a new request, in either UI language.
- **RF-07** — The preview shall show the certificate's name as its title, marked with the certificate's language when it differs from the UI language (`lang` attribute).
- **RF-08** — While the certificate is loading, the preview shall show a loading indicator with an accessible text from the dictionary.
- **RF-09** — While no certificate is rendered, the preview shall keep the Download control disabled.

### Rendering

- **RF-10** — When a PDF certificate has loaded, the preview shall render every page in order, stacked vertically, each fitted to the dialog's width, as the resume preview does.
- **RF-11** — When an image certificate (PNG, JPEG, GIF, WebP or SVG) has loaded, the preview shall show it fitted to the dialog's width, keeping its aspect ratio.
- **RF-12** — While the content is taller than the dialog, the preview shall scroll it inside the dialog, and the page behind shall not scroll.
- **RF-13** — When the dialog's width changes (resize or rotation), the preview shall fit the content to the new width.
- **RF-14** — The preview shall give each rendered PDF page an accessible label with its number and the total, and an image the certificate's name as its text alternative.
- **RF-15** — The preview shall render certificates as static content. It shall not run scripts or forms embedded in a PDF or an SVG.
- **RF-16** — The site shall load the PDF renderer only when a PDF preview (resume or certificate) is first opened. The initial bundle shall not include it.

### Download

- **RF-17** — When the visitor activates Download, the site shall save the certificate already loaded, without a new request.
- **RF-18** — The site shall name the saved file after the certificate's name in kebab-case, with the extension of its type (`.pdf`, `.png`, `.jpg`, `.gif`, `.webp`, `.svg`), the same in both UI languages.
- **RF-19** — When the download starts, the preview shall stay open.

### Closing

- **RF-20** — When the visitor activates Close, presses Escape or clicks outside the dialog, the site shall close the preview.
- **RF-21** — When the preview closes, the site shall return focus to the "View certificate" button that opened it.
- **RF-22** — If the preview is closed while the certificate is still loading, then the site shall cancel the request and the rendering, and shall not reopen or show anything later.

### Layout and accessibility

- **RF-23** — The preview shall be exposed as a modal dialog labelled by the certificate's name. Every control shall have an accessible name and a visible focus.
- **RF-24** — When the preview opens, the site shall move focus into the dialog.
- **RF-25** — While the preview is open, keyboard focus shall stay inside the dialog.
- **RF-26** — Where the viewport is at least the `md` breakpoint, the preview shall be a centered dialog over a dimmed page, like the resume preview.
- **RF-27** — Where the viewport is narrower than `md`, the preview shall take the full screen, and Download and Close shall stay visible while the content scrolls.
- **RF-28** — All preview text (loading, page labels, errors, Retry, Download, Close) shall exist in `messages.en.ts` and `messages.es.ts`.

### Errors

- **RF-29** — If the API answers 404, then the preview shall show the dictionary's "certificate not available" text in the UI language.
- **RF-30** — If the request fails for any other reason (another status, network or CORS failure), then the preview shall show the dictionary's generic error text. It shall never show raw bodies or stack traces.
- **RF-31** — If no response arrives within 30 seconds, then the site shall abort the request and show the dictionary's timeout text.
- **RF-32** — When one of the errors of RF-29 to RF-31 is shown, the preview shall offer Retry, which repeats the request, and keep Close available.
- **RF-33** — If the response is neither a PDF nor a supported image, or cannot be rendered as one, then the preview shall show the dictionary's "unsupported file" text with Close and without Retry.

### Integration with the existing site

- **RF-34** — The resume preview shall keep every behaviour of Spec 006.
- **RF-35** — The Content Security Policy of the static and SSR responses shall let the preview work without adding any origin other than `'self'` and the `API_URL` origin, and opening a PDF or an image certificate shall log no CSP violation.

## Out of scope

- Files on origins other than `API_URL` inside the preview (discarded: it would widen `connect-src`, against constitution §6).
- Formats other than PDF and images (Word, HTML…).
- An "open in a new tab" fallback when the preview fails (discarded in favour of Retry and Close only).
- A download name from the dictionary or from the API's `Content-Disposition` (discarded in favour of the certificate's name).
- Per-language certificate files, or a language parameter on the request.
- Zoom, pagination, print, text selection or clickable links inside the file (same as Spec 006).
- Opening "Verify" in the preview; a deep link that opens a certificate's preview.
- Any `api` or `panel` change.

## Constraints

- No new dependency: PDFs reuse the renderer approved in Spec 006 (constitution §1).
- **Infra (needs approval only if the plan requires it):** showing an image from the loaded bytes must fit the current CSP (`img-src 'self' data: https:`); if the plan needs `blob:` or any other CSP change in `nginx.conf` or `scripts/check-ssr-csp.sh`, that is an infra approval.
- Constitution §2: `/experience` stays server-rendered and the home prerendered; nothing in this feature runs on the server.
- Constitution §3: initial bundle under 500 kB and component styles under 4 kB.
- Constitution §5: the file request goes through `core/services/`.
- Constitution §7 and §8: errors only show dictionary text; semantic HTML, `alt`/accessible names and visible focus.
- **Content, before release:** certificates whose file should open in the preview must have their `fileUrl` on the API (`/files/...`).

## Done criteria

- [ ] Every RF has a unit test where it is logic (service with `HttpTestingController`: PDF, image, 404, other errors, timeout, unsupported type, cancel on close, reuse on reopen; card: button vs. external link; dialog: open, close, focus return, Download name, Retry) or a manual check where it is visual.
- [ ] The resume preview specs still pass unchanged in behaviour (RF-34).
- [ ] `pnpm test --watch=false`, `pnpm build` (no exceeded budgets, renderer outside the initial bundle) and `scripts/check-ssr-csp.sh` pass.
- [ ] `pnpm exec prettier --check` is clean on the touched files.
- [ ] `version` in `package.json` bumped as a minor (feat) in `chore(release): Bump version to vX.Y.Z`.
- [ ] Manual check against the local API: open a PDF and an image certificate from the home and from `/experience`, in EN and under `/es`; download and check the name; close with Escape, the close control and the backdrop; 404 and Retry after stopping the API; an external `fileUrl` still opens in a new tab; at 1280 px and 375 px, keyboard only, with no CSP errors in the console of the Docker `static` and `ssr` images.
