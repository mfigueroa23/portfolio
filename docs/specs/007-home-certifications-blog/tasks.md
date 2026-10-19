# Tasks 007 — Home certifications and blog

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Order:** by dependency. A task starts only when the tasks under "Depends on" are done. Tasks with the same dependencies can run in parallel.
- **Ids:** `D#` = plan decision, `U-*` = unit tests and `M#` = manual checks listed in the plan's test strategy and release.

## Phase 0 — Gate

- [x] **T01 — Confirm the shared certification card**
  - **RF:** RF-04–RF-07
  - **Depends on:** —
  - **Scope:** The spec keeps `/experience` out of scope, and D3 moves its certification card into a shared `app-certification-card` with no visible change. The owner either accepts D3, or D3 becomes "copy the card into the home" and T04 skips the `/experience` switch.
  - **Done when:** `plan.md` D3 states the owner's choice, and the plan's `Status` reads `Approved`.

## Phase 1 — Foundations

- [x] **T02 — Dictionary texts**
  - **RF:** RF-21, RF-22
  - **Depends on:** — (can run in parallel with T01, T03, T05)
  - **Scope:** In `messages.en.ts` and `messages.es.ts`, add `nav.certifications`, a `certifications` key (eyebrow, heading, intro, viewMore, soon, updating) and a `blog` key (eyebrow, viewMore, soon, soonText), with the copy from the spec's Decisions table (Copy row). Extend `messages.spec.ts`.
  - **Done when:** U-MS-1 passes and `pnpm build` compiles, so no Spanish key is missing.

- [x] **T03 — `ContentService.latestPosts()`**
  - **RF:** RF-11, RF-17–RF-20
  - **Depends on:** — (can run in parallel with T01, T02, T05)
  - **Scope:** Add `'certifications'` to `ContentCollection` in `core/interfaces/content.ts`. Extract the body of `collection()` into a private `live()` helper that takes a `pick` mapper, then add `latestPosts()`, which picks the `items` of `GET /content/posts` (D1). Add the tests to `content.service.spec.ts`.
  - **Done when:** U-CS-1–U-CS-4 pass, and every existing `ContentService` test passes unchanged.

## Phase 2 — Cards

- [x] **T04 — `CertificationCard` and `/experience`**
  - **RF:** RF-04–RF-07, RF-20
  - **Depends on:** T01
  - **Scope:** Create `components/certification-card/` (`.ts`, `.html`, `.spec.ts`). The card owns its date formatting and the `'UTC'` → browser time zone signal (D3), and reads its labels from `m().pages.experience` (D4). Unless T01 decided otherwise, switch `experience-page.ts`/`.html` to the card: the list keeps its ascending `position` order, and the `CertificationCard` interface and the `timeZone` signal leave the page.
  - **Done when:** U-CC-1–U-CC-6 pass, and the existing `experience-page.spec.ts` tests (U-EP) pass unchanged.

- [x] **T05 — `PostCard`**
  - **RF:** RF-12–RF-14, RF-20
  - **Depends on:** — (can run in parallel with T01–T03)
  - **Scope:** Create `components/post-card/` (`.ts`, `.html`, `.spec.ts`), a vertical card with the cover on top and a stretched title link (D7). Post URLs are built in the page language and use `slugEs` under `/es`, like `ProjectCard.href`. Tag links go through `tagKey` from `core/utils/text.ts`. The date uses `app-local-date`, and the reading time uses `pages.readingTime`.
  - **Done when:** U-PC-1–U-PC-5 pass.

## Phase 3 — Sections

- [x] **T06 — Certifications section**
  - **RF:** RF-01–RF-03, RF-08, RF-09, RF-17, RF-21
  - **Depends on:** T02, T03, T04
  - **Scope:** Create `sections/certifications/` (`.ts`, `.html`, empty `.css`, `.spec.ts`):
    - Data: `collection('certifications')`, sorted by issue date descending, then `position`, keeping 3 (D2).
    - Layout: centred header and a 3-column grid (D8).
    - "See all certifications" links to `language.href('/experience#certifications')`.
    - When empty, show the empty-state card and no link (D9).
  - **Done when:** U-SC-1–U-SC-7 pass.

- [x] **T07 — Blog section**
  - **RF:** RF-10, RF-11, RF-15, RF-16, RF-17, RF-21
  - **Depends on:** T02, T03, T05 (can run in parallel with T06)
  - **Scope:** Create `sections/blog/` (`.ts`, `.html`, empty `.css`, `.spec.ts`):
    - Data: `latestPosts()`, keeping the first 2.
    - Layout: left-aligned header with the `/blog` heading and intro, and a 2-column grid (D8).
    - "Read all posts" links to `language.href('/blog')`.
    - When empty, show the empty-state card and no link (D9).
  - **Done when:** U-SB-1–U-SB-6 pass.

## Phase 4 — Integration

- [x] **T08 — Home order**
  - **RF:** RF-01, RF-10
  - **Depends on:** T06, T07
  - **Scope:** `home.ts` imports `Certifications` and `Blog`. `home.html` renders Hero · About · Projects · Experience · Certifications · Blog · Testimonials · Contact. Extend `home.spec.ts`.
  - **Done when:** U-HM-1 passes.

- [x] **T09 — Navigation links and mobile menu**
  - **RF:** RF-22–RF-25
  - **Depends on:** T02 (can run in parallel with T03–T08)
  - **Scope:** `navigation.ts` changes `navLinks` to About, Projects, Experience, Certifications (`/#certifications`), Blog (`/#blog`), Testimonials (D5). `navigation.html` gets one delegated `(click)` on the mobile `<nav>`, which closes the menu when the target is inside an `<a>` (D6). Update `navigation.spec.ts`: the old `/blog` link test becomes U-NV-2.
  - **Done when:** U-NV-1–U-NV-6 pass.

## Phase 5 — Verification and release

- [x] **T10 — Quality gate**
  - **RF:** —
  - **Depends on:** T08, T09
  - **Scope:** Run the `AGENTS.md` closing checks on the whole branch.
  - **Done when:**
    - `pnpm test --watch=false` passes with no failures.
    - `pnpm build` finishes with no errors or exceeded budgets (initial < 500 kB, component styles < 4 kB).
    - `scripts/check-ssr-csp.sh` passes.
    - `pnpm exec prettier --check` is clean on every touched file.
  - Run on 2026-10-18: 57 test files and 522 tests pass. `pnpm build` has no errors or exceeded budgets (initial total 392.53 kB) and prerenders 2 routes. `scripts/check-ssr-csp.sh` reports that the generated CSP covers every inline script of the SSR pages. Prettier is clean on the 31 files of the branch.

- [x] **T11 — Manual checks**
  - **RF:** RF-01, RF-08, RF-10, RF-15, RF-17, RF-23–RF-25
  - **Depends on:** T10
  - **Scope:** Run the checks the tests cannot cover. Use the build from T10, with the prerendered files under `dist/devsonic.cl/browser/` and the SSR server (`node dist/devsonic.cl/server/server.mjs`), at desktop and phone width.
  - **Done when:**
    - M1: the prerendered `index.html` and `es/index.html` contain `id="certifications"` with 3 cards and `id="blog"` with 2 posts.
    - M2: Certifications and Blog in the menu scroll to their sections from the home and from `/blog`, and each "see all" button opens its page.
    - M3: the phone menu closes after choosing a section, the contact button or a language.
    - M4: `/experience` looks as before.
    - Any failure is noted here.
  - Run on 2026-10-18 with `API_URL=https://api.figueroa-sanchez.com pnpm build`. The default build reads `API_URL=http://localhost:3000` from `.env`, and with no local API every home section prerenders its empty state, which also shows RF-09 and RF-16 on a real build. The pages were opened in a headless Chromium driven over CDP. The SSR server does not serve the static files (nginx does in production), so a small local stand-in of `nginx.conf` served `dist/devsonic.cl/browser` and proxied the SSR routes to it. All 13 checks pass:
    - M1: `index.html` and `es/index.html` hold 3 certifications (Data Analytics, then Basic Software Design and Basic Programming, which win the 2025-06-24 tie by position) and 2 posts, with "see all" links to `/experience#certifications` and `/blog` (`/es/…` in Spanish).
    - RF-19: the browser refetch is rejected by the production API's CORS on `localhost`, and the prerendered 3 certifications and 2 posts stay.
    - M2: the menu's Certifications and Blog scroll to their sections, also from `/blog`. "See all certifications" opens `/experience` with its heading 112 px from the top, below the fixed header (a `scroll-mt-28` was added to that heading in T04). "Read all posts" opens `/blog`.
    - M3: at 390 × 844 under `/es`, the menu lists Sobre mí, Proyectos, Experiencia, Certificaciones, Blog and Testimonios. It closes, with the bars icon back, after Certificaciones (the page shows the section), Contáctame (`#contact`) and EN (opens `/`).
    - M4: `/experience` shows its 5 certifications in the owner's order with the same cards (screenshot reviewed).
    - Not checked: a real phone, and browsers other than Chromium.

- [ ] **T12 — Version bump**
  - **RF:** —
  - **Depends on:** T11
  - **Scope:** In `package.json`, change `version` from 4.2.0 to 4.3.0 (feat → minor). No `README.md` change (plan, Infrastructure).
  - **Done when:** the last commit of the branch is `chore(release): Bump version to v4.3.0`, and `pnpm build` still passes.

## RF → tasks

| RF           | Tasks              |
| ------------ | ------------------ |
| RF-01        | T06, T08, T11      |
| RF-02, RF-03 | T06                |
| RF-04, RF-05 | T01, T04           |
| RF-06, RF-07 | T01, T04           |
| RF-08, RF-09 | T06, T11 (RF-08)   |
| RF-10        | T07, T08, T11      |
| RF-11        | T03, T07           |
| RF-12–RF-14  | T05                |
| RF-15, RF-16 | T07, T11 (RF-15)   |
| RF-17        | T03, T06, T07, T11 |
| RF-18, RF-19 | T03                |
| RF-20        | T03, T04, T05      |
| RF-21        | T02, T06, T07      |
| RF-22        | T02, T09           |
| RF-23, RF-24 | T09, T11           |
| RF-25        | T09, T11           |
