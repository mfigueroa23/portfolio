# Plan 007 — Home certifications and blog

- **Spec:** [spec.md](spec.md) (approved 2026-10-18)
- **Status:** Draft
- **Version:** 4.3.0 (feat → minor)

The plan keeps the fixed stack with no new dependency (constitution §1) and adds no SSR route:
the home and `/es` stay prerendered (§2), and the two new sections follow the existing home
sections, a prerendered GET plus a browser refetch through `ContentService` (§5, the only place
that injects `HttpClient`). An API failure only ever shows the empty-state texts of the
dictionaries (§7), every new text lives in `messages.en.ts` and `messages.es.ts`, and every new
link keeps the site's visible focus ring (§8). Nothing touches `angular.json`, budgets, infra or
the API, so no approval is pending beyond the spec.

## Endpoints

The web consumes, unchanged, two public endpoints of `api`:

| Method and route                                   | Auth | Response                                                                      | RF                  |
| -------------------------------------------------- | ---- | ----------------------------------------------------------------------------- | ------------------- |
| `GET {API_URL}/content/certifications?lang=en\|es` | —    | 200 `Certification[]`, every certification, ordered by `position`             | RF-02, RF-03, RF-20 |
| `GET {API_URL}/content/posts?lang=en\|es` (page 1) | —    | 200 `PostPage`, the 10 newest published posts in `items`; `items: []` if none | RF-11, RF-20        |

## Modules

### New: `src/app/components/certification-card/` (`CertificationCard`, `app-certification-card`)

| File                         | Responsibility                                                                                                                                                                                                                                                                                                                                                                | RF                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `certification-card.ts`      | `certification = input.required<Certification>()`. Computes `issued`/`expires` with `formatCalendarDate` and `expired` with `isExpired(expiryDate, new Date(), timeZone())`, where `timeZone` starts as `'UTC'` and becomes the browser's zone in `afterNextRender`, the `LocalDate` pattern (D3). Texts from `m().pages.experience` (D4); `lang` from `language.itemLang()`. | RF-04–RF-07, RF-20  |
| `certification-card.html`    | The `<article>` markup moved as is from `experience-page.html`: award icon, `<h3>` name, issuer, `<dl>` of issued / expires (or "no expiry") / credential, and the certificate and verify links in new tabs, each only when present.                                                                                                                                          | RF-04, RF-05, RF-06 |
| `certification-card.spec.ts` | U-CC-1…U-CC-6.                                                                                                                                                                                                                                                                                                                                                                |                     |

### New: `src/app/components/post-card/` (`PostCard`, `app-post-card`)

| File                | Responsibility                                                                                                                                                                                                                                                                                                                                      | RF                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `post-card.ts`      | `post = input.required<PostSummary>()`. `href` in the page language with the Spanish slug under `/es`, like `ProjectCard.href` (RF-169 of Spec 004); `tagHref(tag)` = `language.href('/blog/tag/' + tagKey(tag))` with `tagKey` from `core/utils/text.ts`.                                                                                          | RF-13, RF-14               |
| `post-card.html`    | Vertical card from the approved mockup: cover on top (`<img>` with `alt` = title, `loading="lazy"`, only when `coverUrl`), then `<app-local-date>` · `pages.readingTime(n)`, `<h3>` with the stretched link of `/blog` (whole card clickable), summary and tag links above the stretched link (`relative z-10`). `lang` from `language.itemLang()`. | RF-12, RF-13, RF-14, RF-20 |
| `post-card.spec.ts` | U-PC-1…U-PC-5.                                                                                                                                                                                                                                                                                                                                      |                            |

### New: `src/app/sections/certifications/` (`Certifications`, `app-certifications`)

| File                     | Responsibility                                                                                                                                                                                                                                                                                                                                    | RF                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `certifications.ts`      | `content.collection<Certification>('certifications')`; `latest = computed` copying the list, sorting by `issueDate` descending, then `position` ascending, and keeping `HOME_CERTIFICATIONS = 3` (D2).                                                                                                                                            | RF-02, RF-03, RF-17–RF-19  |
| `certifications.html`    | `<section id="certifications">` with the centred header of Projects (`m().certifications.eyebrow`, `heading`, `intro`), a `md:grid-cols-2 lg:grid-cols-3` grid of `app-certification-card`, and the "see all" link of Projects to `language.href('/experience#certifications')`; else the empty-state card of Projects (`fa-award`) with no link. | RF-01, RF-08, RF-09, RF-21 |
| `certifications.css`     | Empty, like the other sections (`styleUrl` kept for the convention).                                                                                                                                                                                                                                                                              |                            |
| `certifications.spec.ts` | U-SC-1…U-SC-7.                                                                                                                                                                                                                                                                                                                                    |                            |

### New: `src/app/sections/blog/` (`Blog`, `app-blog`)

| File           | Responsibility                                                                                                                                                                                                                                                                                         | RF                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `blog.ts`      | `content.latestPosts()` (D1); `posts = computed(() => latest().slice(0, HOME_POSTS))` with `HOME_POSTS = 2`, keeping the API's newest-first order.                                                                                                                                                     | RF-11, RF-17–RF-19         |
| `blog.html`    | `<section id="blog">` with the left-aligned header of Experience (`m().blog.eyebrow`, and the `/blog` heading and intro from `m().pages.blog`), a `md:grid-cols-2` grid of `app-post-card`, and the "see all" link to `language.href('/blog')`; else the empty-state card (`fa-pen-nib`) with no link. | RF-10, RF-15, RF-16, RF-21 |
| `blog.css`     | Empty.                                                                                                                                                                                                                                                                                                 |                            |
| `blog.spec.ts` | U-SB-1…U-SB-6.                                                                                                                                                                                                                                                                                         |                            |

### Changed

| File                                                        | Change                                                                                                                                                                                                                                                                                                                                                                                   | RF                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `src/app/core/interfaces/content.ts`                        | `'certifications'` added to `ContentCollection`.                                                                                                                                                                                                                                                                                                                                         | RF-02                |
| `src/app/core/services/content.service.ts`                  | The body of `collection()` moves to a private `live<R, T>(url, params, pick: (body: R) => T[])`, unchanged otherwise (5 s timeout, `[]` on failure, browser refetch without the transfer cache, no emission when equal). `collection()` calls it with the identity; new `latestPosts(): Signal<PostSummary[]>` calls it with `/content/posts` and `(page: PostPage) => page.items` (D1). | RF-17–RF-20          |
| `src/app/core/services/content.service.spec.ts`             | U-CS-1…U-CS-4.                                                                                                                                                                                                                                                                                                                                                                           |                      |
| `src/app/pages/experience-page/experience-page.ts`, `.html` | The card markup, `CertificationCard` interface, date mapping and `timeZone` signal leave for `app-certification-card`; `certificationCards` becomes the list sorted by `position` (manual order kept, spec Out of scope). The existing tests (U-EP) must pass unchanged (D3).                                                                                                            | RF-04–RF-07 (shared) |
| `src/app/pages/home/home.ts`, `home.html`                   | Imports `Certifications` and `Blog`; order: Hero · About · Projects · Experience · Certifications · Blog · Testimonials · Contact.                                                                                                                                                                                                                                                       | RF-01, RF-10         |
| `src/app/pages/home/home.spec.ts`                           | U-HM-1.                                                                                                                                                                                                                                                                                                                                                                                  |                      |
| `src/app/components/navigation/navigation.ts`               | `navLinks`: About, Projects, Experience, Certifications (`/#certifications`), Blog (`/#blog`), Testimonials (D5). `closeMenu(event)`: sets `isMobileMenuOpen` to `false` when the click target is inside an `<a>` (D6).                                                                                                                                                                  | RF-22–RF-25          |
| `src/app/components/navigation/navigation.html`             | `(click)="closeMenu($event)"` on the mobile menu's `<nav>`, which holds the section links, the language switch and the contact button.                                                                                                                                                                                                                                                   | RF-25                |
| `src/app/components/navigation/navigation.spec.ts`          | "links to the blog" (`/blog`) becomes U-NV-2; U-NV-1…U-NV-6.                                                                                                                                                                                                                                                                                                                             |                      |
| `src/app/core/i18n/messages.en.ts`, `messages.es.ts`        | `nav.certifications` ("Certifications" / "Certificaciones"); `certifications` (eyebrow, heading, intro, viewMore, soon, updating) and `blog` (eyebrow, viewMore, soon, soonText) with the approved copy (spec Decisions, Copy). `Messages` derives from `en`, so a missing Spanish key fails the build.                                                                                  | RF-21, RF-22         |
| `src/app/core/i18n/messages.spec.ts`                        | U-MS-1.                                                                                                                                                                                                                                                                                                                                                                                  |                      |

### Infrastructure

| File           | Change                                      |
| -------------- | ------------------------------------------- |
| `package.json` | `version` 4.2.0 → 4.3.0 (`chore(release)`). |

No change to `app.routes.server.ts`, `angular.json`, `nginx.conf`, `Dockerfile`, `scripts/` or
`README.md` (the home's sections are not listed there).

## Data model

No schema change. The web reads two existing shapes from `core/interfaces/content.ts`:
`Certification` (`issueDate` is a `YYYY-MM-DD` calendar date, `position` the owner's order) and
`PostPage.items: PostSummary[]` (already newest first). Lexicographic comparison of `issueDate`
equals chronological order because the format is fixed-width.

## Decisions

| #   | Decision                                                                                                                                                    | Discarded alternative                                                                                 | Why                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `ContentService.latestPosts()` reads page 1 of `GET /content/posts` and picks `items`, sharing `collection()`'s logic through a private `live()` helper.    | `GET /content/posts/feed` (an array, so `collection()` could take it as is), or a `limit` on the API. | The feed returns 20 posts against 10 for page 1, and it exists for RSS; a `limit` needs an API release, which the spec rules out. Sharing `live()` keeps one implementation of RF-17 to RF-19 instead of a second copy of the refetch logic.                             |
| D2  | The section sorts all certifications in the browser and on the server (issue date desc, `position` asc) and keeps 3.                                        | Trust the API order (`position`), as the Projects section trusts it.                                  | The API orders by `position` (RF-03 only uses it to break ties); the spec forbids an API change, and the list is a handful of rows, so sorting it costs nothing.                                                                                                         |
| D3  | A shared `CertificationCard`, used by `/experience` and the home, that owns its dates and its `'UTC'` → browser time zone signal.                           | Copy the card markup and the mapping into the new section.                                            | RF-04 to RF-06 say "as `/experience` does": one component keeps both pages identical. Owning the zone signal (like `LocalDate`) makes RF-07 hold on the prerendered home, where `now` would otherwise be the build date; the `/experience` tests guard the move.         |
| D4  | The card keeps reading its labels from `m().pages.experience` (issued, expires, expired, noExpiry, credential, viewCertificate, verify).                    | Move them to a new shared `certification` key.                                                        | Same texts on both pages; moving keys churns both dictionaries and the `/experience` code for no visible change. Only the section's own texts are new (RF-21).                                                                                                           |
| D5  | Certifications and Blog in `navLinks` as `/#certifications` and `/#blog`, through `language.href()` like the other section links.                           | Keep Blog pointing to `/blog`, or add a separate home-only link set.                                  | RF-23 and RF-24; `language.href()` already turns them into `/es#…` and makes them work from any page (`/blog` included), as the existing test of section links checks.                                                                                                   |
| D6  | One delegated `(click)` on the mobile `<nav>` closes the menu when the target is inside an `<a>`.                                                           | A `(click)` on each link, or closing on `NavigationEnd`/`hashchange`.                                 | The links are plain `href` anchors, not router links, so a same-page `#section` fires no router event (that is the bug); one handler covers the section links, the contact `app-button` and the `app-language-switch` anchors without touching those components (RF-25). |
| D7  | `PostCard` is a new home-only component; `/blog` keeps its own row markup.                                                                                  | Make `/blog` use the new card.                                                                        | The approved layout puts the cover on top in two columns, `/blog` puts it on the left in one; the spec keeps `/blog` out of scope.                                                                                                                                       |
| D8  | Section headers: Certifications centred (Projects' header), Blog left-aligned (Experience's header), "see all" links reuse Projects' outlined link classes. | One header style for both, or Projects' `app-animated-button`.                                        | Approved mockup; reusing the existing class strings keeps both sections' CSS files empty (4 kB budget, §3).                                                                                                                                                              |
| D9  | The empty state shows no "see all" link and is decided from the item count only.                                                                            | Keep the link with the empty state, or tell a failure apart from an empty list.                       | RF-09 and RF-16; `collection()` already turns a failure into `[]`, so both cases render the same card without exposing errors (§7).                                                                                                                                      |

## RF coverage

| RF           | Where                                                | Tests                                       |
| ------------ | ---------------------------------------------------- | ------------------------------------------- |
| RF-01        | `home.html`, `certifications.html`                   | U-HM-1, U-SC-1                              |
| RF-02, RF-03 | `certifications.ts` (D2)                             | U-SC-2, U-SC-3                              |
| RF-04        | `certification-card.html`                            | U-CC-1, U-EP (existing)                     |
| RF-05        | `certification-card.html`                            | U-CC-2, U-CC-3                              |
| RF-06        | `certification-card.ts`                              | U-CC-4                                      |
| RF-07        | `certification-card.ts` (D3)                         | U-CC-5                                      |
| RF-08        | `certifications.html`                                | U-SC-4, U-SC-6                              |
| RF-09        | `certifications.html` (D9)                           | U-SC-5                                      |
| RF-10        | `home.html`, `blog.html`                             | U-HM-1, U-SB-1                              |
| RF-11        | `blog.ts`, `ContentService.latestPosts()` (D1)       | U-SB-2, U-CS-1                              |
| RF-12        | `post-card.html`                                     | U-PC-1, U-PC-2                              |
| RF-13        | `post-card.ts`                                       | U-PC-3, U-PC-4                              |
| RF-14        | `post-card.ts`                                       | U-PC-3                                      |
| RF-15        | `blog.html`                                          | U-SB-3, U-SB-6                              |
| RF-16        | `blog.html` (D9)                                     | U-SB-4                                      |
| RF-17        | `ContentService.live()`                              | U-CS-1, existing initial-load tests, M1     |
| RF-18        | `ContentService.live()`                              | U-CS-2, existing refetch tests              |
| RF-19        | `ContentService.live()`                              | U-CS-3, existing "keeps the previous items" |
| RF-20        | `ContentService` (`lang` param), cards' `itemLang()` | U-CS-4, U-CC-6, U-PC-5                      |
| RF-21        | `messages.en.ts`, `messages.es.ts`                   | U-MS-1, U-SC-6, U-SB-6                      |
| RF-22        | `navigation.ts` (D5)                                 | U-NV-1                                      |
| RF-23, RF-24 | `navigation.ts` (D5)                                 | U-NV-2, U-NV-3                              |
| RF-25        | `navigation.ts`, `navigation.html` (D6)              | U-NV-4, U-NV-5, U-NV-6                      |

## Test strategy

All unit tests, Vitest + TestBed, without network: `ContentService` with `HttpTestingController`,
sections with a `ContentService` stub (`collection`/`latestPosts` returning `signal(data)`, the
Projects spec pattern), Spanish through a `PlatformLocation` stub with `pathname: '/es'`.

**ContentService (`content.service.spec.ts`)**

- U-CS-1 — `latestPosts()` asks `GET /content/posts` with `lang` and no `page`, and emits `items` of the response; `[]` before it answers.
- U-CS-2 — After the first render it refetches without the transfer cache and replaces the items when they changed.
- U-CS-3 — A failed initial load gives `[]`; a failed refetch keeps the previous items.
- U-CS-4 — `collection('certifications')` and `latestPosts()` ask `lang=es` on Spanish pages, on both requests.

**CertificationCard (`certification-card.spec.ts`)**

- U-CC-1 — Shows name, issuer, the issue date as `Apr 17, 2026`, "No expiry" when `expiryDate` is null and the credential ID only when present.
- U-CC-2 — Links the certificate file and the verification URL with `target="_blank"` and `rel="noopener noreferrer"`.
- U-CC-3 — Shows neither link when both URLs are null.
- U-CC-4 — Labels a certification whose expiry date is before today as "Expired", and not one that expires today or later.
- U-CC-5 — Before `afterNextRender` the expiry is judged in UTC; after it, in the runtime's zone with the current date (fake timers set past the expiry).
- U-CC-6 — In Spanish: `17 abr 2026`, "Emitida", and `lang="en"` on an item the API returned in English.

**Certifications section (`certifications.spec.ts`)**

- U-SC-1 — Renders `section#certifications` with the section heading.
- U-SC-2 — With 5 certifications shows 3, newest issue date first.
- U-SC-3 — Breaks an issue-date tie by `position` (the live data: one 2026 cert, four tied in 2025 → the 2026 one and positions 0 and 1).
- U-SC-4 — Shows "See all certifications" linking to `/experience#certifications`.
- U-SC-5 — With no certifications shows the empty state and no link to `/experience`.
- U-SC-6 — In Spanish: texts and the link `/es/experience#certifications`.
- U-SC-7 — Calls `collection('certifications')` once, with no `limit`.

**PostCard (`post-card.spec.ts`)**

- U-PC-1 — Shows the cover with `alt` = title when `coverUrl` is set, and no `<img>` when null.
- U-PC-2 — Shows the date (`<time datetime>`), "7 min read", title, summary and every tag.
- U-PC-3 — Links the title to `/blog/<slug>` and each tag to `/blog/tag/<tag key>` (`raspberry pi` → `raspberry-pi`).
- U-PC-4 — In Spanish links to `/es/blog/<slugEs>`, and to `/es/blog/<slug>` when `slugEs` is null.
- U-PC-5 — Sets `lang="en"` on a post returned in English on a Spanish page.

**Blog section (`blog.spec.ts`)**

- U-SB-1 — Renders `section#blog` with the `/blog` heading.
- U-SB-2 — With 3 posts shows the first 2, in the API order.
- U-SB-3 — Shows "Read all posts" linking to `/blog`.
- U-SB-4 — With no posts shows the empty state and no link to `/blog`.
- U-SB-5 — Calls `latestPosts()` once.
- U-SB-6 — In Spanish: texts and the link `/es/blog`.

**Navigation (`navigation.spec.ts`)**

- U-NV-1 — The section links read, in order, About, Projects, Experience, Certifications, Blog, Testimonials, on desktop and in the opened mobile menu.
- U-NV-2 — Certifications and Blog point to `/#certifications` and `/#blog`; nothing links `/blog` directly.
- U-NV-3 — In Spanish they point to `/es#certifications` and `/es#blog` with "Certificaciones" and "Blog".
- U-NV-4 — Clicking a section link in the open mobile menu closes it and shows the bars icon again.
- U-NV-5 — Clicking the contact button or a language link in the open mobile menu closes it.
- U-NV-6 — Clicking the menu's empty space (not a link) leaves it open.

**Home, dictionaries and `/experience`**

- U-HM-1 — The home renders its sections in order: `about`, `projects`, `experience`, `certifications`, `blog`, `testimonials`, `contact` (ids in DOM order).
- U-MS-1 — `certifications` and `blog` have the same keys in English and Spanish, and `nav.certifications` exists in both.
- U-EP — The existing `experience-page.spec.ts` certification tests pass unchanged after the card moves (ascending `position`, links, expired label, Spanish dates, `lang`).

Not covered automatically, checked by hand in **Release**: the prerendered HTML holding both
sections (RF-17), the real scroll to `#certifications`/`#blog` from the home and from `/blog`, and
the menu closing on a real phone (jsdom has no layout or scrolling).

## Implementation order

1. Dictionaries: `nav.certifications`, `certifications`, `blog` in English and Spanish (U-MS-1).
2. `ContentService`: `'certifications'` in `ContentCollection`, `live()` extraction and `latestPosts()` (U-CS-*; the existing tests must stay green).
3. `CertificationCard`, then `/experience` switched to it (U-CC-*, U-EP).
4. `Certifications` section (U-SC-*).
5. `PostCard`, then the `Blog` section (U-PC-_, U-SB-_).
6. Home order (U-HM-1).
7. Navigation links and mobile menu closing (U-NV-*).
8. `pnpm test --watch=false`, `pnpm build`, `scripts/check-ssr-csp.sh`, `pnpm exec prettier --check` on the touched files.
9. `chore(release): Bump version to v4.3.0`.

## Release

1. No API change or migration: the endpoints are already live.
2. Merge after `test.yaml` passes; `release.yaml` publishes and pins `portfolio` and `portfolio-ssr`; `rollout status` succeeds and `/healthz` answers.
3. Manual checks:
   - M1 — `curl` the prerendered `/` and `/es`: both contain `id="certifications"` with 3 cards and `id="blog"` with 2 posts (RF-17).
   - M2 — Desktop and phone width on `/` and `/es`: the menu's Certifications and Blog scroll to their sections from the home and from `/blog`; "See all certifications" opens `/experience` at its certifications; "Read all posts" opens `/blog`.
   - M3 — Phone: the menu closes after a section link (same page), the contact button and a language.
   - M4 — `/experience` looks as before (manual order, same cards).

## Risks

- **Expired label flicker on the home:** the prerendered label is computed at build time and may change after hydration (RF-07). Impact: a certification that expired after the build shows "Expired" a moment later. Accepted; it is the same mechanism `/experience` already uses for the visitor's zone.
- **Refactoring `collection()`:** a mistake would break every home section. Mitigation: the existing initial-load and refetch tests run against `collection()` unchanged, and `live()` is extracted before `latestPosts()` uses it.
- **Moving the card out of `/experience`:** a visual regression on a server-rendered page. Mitigation: the markup moves as is, U-EP stays unchanged, and M4.
- **Menu height on small phones:** six links plus the language switch and the button make the open menu taller. Mitigation: the menu still fits 390 × 844 (approved mockup); checked in M3.
