# Spec 007 — Home certifications and blog

- **Status:** Approved
- **Date:** 2026-10-18
- **Scope:** `web` only (consumes the existing `GET /content/certifications` and `GET /content/posts` from `api`; no API change)

## Why

The home is the page most visitors see, but it says nothing about certifications or the blog.
Certifications only appear at the bottom of `/experience`, and the blog is a separate page that
the menu opens directly, so a visitor skimming the home never learns that there are recent
credentials or new articles unless they leave it.

On phones the menu has a second problem: choosing an option does not close it. When the option
is a section of the same page, the page scrolls behind the open menu and the visitor must close it
by hand to see where they landed.

## Decisions

| Topic                 | Decision                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest certifications | The 3 with the most recent issue date, newest first; ties follow the owner's display order. `/experience` keeps the owner's manual order.                                                                                                                                                               |
| Latest posts          | The 2 published posts with the most recent publication date, newest first.                                                                                                                                                                                                                              |
| Placement             | Home order: Hero · About · Projects · Experience · Certifications · Blog · Testimonials · Contact. The menu follows the same order.                                                                                                                                                                     |
| Menu targets          | Certifications and Blog scroll to their home sections, like the other section links. The menu no longer links `/blog` directly.                                                                                                                                                                         |
| See more              | Certifications → `/experience#certifications`; Blog → `/blog`. Shown only while the section has items, like Projects.                                                                                                                                                                                   |
| Empty or API down     | The section stays, with an empty-state card and no "see more" button, so the menu link always has a target.                                                                                                                                                                                             |
| Card content          | Same data as today's certification cards on `/experience` and post cards on `/blog`.                                                                                                                                                                                                                    |
| Layout                | Approved mockup (https://claude.ai/artifact/KRawdGHDWxeKB4nsE5GJX1): certifications in 3 columns on desktop with a centred header; posts in 2 columns with the cover on top and a left-aligned header; everything stacks on phones; "see all" buttons centred below, styled like Projects' "View more". |
| Copy                  | Certifications: "Credentials" / "Always _learning._" ("Credenciales" / "Siempre _aprendiendo._"), "See all certifications" / "Ver todas las certificaciones". Blog: "Latest Writing" / "Lo último del blog", the `/blog` heading and intro, "Read all posts" / "Ver todos los artículos".               |     |
| Mobile menu           | Closes after any option is chosen: a section link, the contact button or a language.                                                                                                                                                                                                                    |
| API                   | No change: the site picks the 3 latest certifications and 2 latest posts from the existing endpoints.                                                                                                                                                                                                   |

## Functional requirements

"The site" is this Angular app; "the home" is the prerendered page at `/` and `/es`. "Visitor" is
anyone browsing it. "Page language" is `en` (root) or `es` (under `/es`); every link below is
written in English and points to its `/es/…` equivalent under `/es`. "The menu" is the header
navigation, on desktop and on phones ("mobile menu").

### Certifications section

- **RF-01** — The home shall show a Certifications section with the anchor `certifications`, right after the Experience section.
- **RF-02** — The home shall show at most 3 certifications in that section: the ones with the most recent issue date, newest first.
- **RF-03** — The home shall order certifications with the same issue date by the owner's display order.
- **RF-04** — The home shall show for each certification its name, issuer, issue date, expiry date (or the "no expiry" text) and credential ID when it has one, as `/experience` does.
- **RF-05** — The home shall show the "view certificate" and "verify" links of a certification only when it has a file or a verification URL, opening them in a new tab.
- **RF-06** — While a certification's expiry date has passed, the home shall mark it with the same "expired" label as `/experience`.
- **RF-07** — While the home is open in the browser, the site shall decide whether a certification has expired with the visitor's current date and time zone, not the build date.
- **RF-08** — While the section shows at least one certification, the home shall show a "see all certifications" button linking to `/experience#certifications`.
- **RF-09** — If there are no certifications or the API does not answer, then the home shall show an empty-state card in the section and no "see all" button.

### Blog section

- **RF-10** — The home shall show a Blog section with the anchor `blog`, right after the Certifications section.
- **RF-11** — The home shall show at most 2 posts in that section: the published posts with the most recent publication date, newest first.
- **RF-12** — The home shall show for each post its cover when it has one, publication date, reading time, title, summary and tags, as the `/blog` listing does.
- **RF-13** — When the visitor selects a post, the site shall open that post's page in the page language (`/blog/<slug>`, or `/es/blog/<Spanish slug or slug>`).
- **RF-14** — When the visitor selects a post's tag, the site shall open that tag's page (`/blog/tag/<tag key>`).
- **RF-15** — While the section shows at least one post, the home shall show a "see all posts" button linking to `/blog`.
- **RF-16** — If there are no published posts or the API does not answer, then the home shall show an empty-state card in the section and no "see all" button.

### Content and language

- **RF-17** — The home shall include both sections, with the content the API returned at build time, in the prerendered HTML of `/` and `/es`.
- **RF-18** — When the home finishes loading in the browser, the site shall replace both sections' content with the API's current content.
- **RF-19** — If the API does not answer after the home loads in the browser, then the site shall keep the prerendered content of both sections unchanged.
- **RF-20** — The site shall request certifications and posts in the page language and mark each item returned in another language with that language (`lang` attribute).
- **RF-21** — The site shall take every text of both sections (eyebrow, heading, intro, buttons, empty states) from the English and Spanish dictionaries.

### Navigation

- **RF-22** — The menu shall show its section links in this order, on desktop and on phones: About, Projects, Experience, Certifications, Blog, Testimonials.
- **RF-23** — When the visitor selects Certifications in the menu, the site shall take them to the Certifications section of the home (`/#certifications`).
- **RF-24** — When the visitor selects Blog in the menu, the site shall take them to the Blog section of the home (`/#blog`).

### Mobile menu

- **RF-25** — When the visitor selects any option in the open mobile menu (a section link, the contact button or a language), the site shall close the menu and show the open-menu icon again.

## Out of scope

- API changes (a `limit` on certifications or posts): the site picks the latest items from the existing responses.
- Changing `/experience` (its certifications keep the owner's manual order) or the `/blog` page.
- Hiding the new sections when they are empty (discarded: the menu link would have no target).
- Choosing the home certifications by the owner's manual order (discarded in favour of issue date).
- Closing the mobile menu with Escape or a tap outside it, and highlighting the active section in the menu.
- Featured or pinned posts.

## Constraints

- No new dependencies, SSR routes, `angular.json`/budget changes or infra; nothing needs approval beyond this spec.
- Constitution 2: the home and `/es` stay prerendered.
- Constitution 3: the initial bundle stays under 500kB and each component's styles under 4kB.
- Constitution 5: certifications and posts come only through `core/services/`.
- Constitution 7: an API failure shows only the empty-state texts, never raw errors.
- Constitution 8: every new text exists in `messages.en.ts` and `messages.es.ts`; semantic HTML, `alt` on post covers and visible focus on every new link and button.

## Done criteria

- [ ] Tests cover RF-01 to RF-25: at most 3 certifications and 2 posts, ordering and ties, empty state without "see all", "see all" links in both languages, expired label, `lang` on untranslated items, menu order and targets in both languages, and the mobile menu closing on each kind of option.
- [ ] `pnpm test --watch=false`, `pnpm build` (no exceeded budgets) and `scripts/check-ssr-csp.sh` pass.
- [ ] `pnpm exec prettier --check` is clean on the touched files.
- [ ] `version` in `package.json` bumped to the next minor in a `chore(release): Bump version to vX.Y.Z` commit.
- [ ] Manual check on `/` and `/es` (desktop and phone width): the sections show the 3 latest certifications and the 2 latest posts, the menu's Certifications and Blog links scroll to them from the home and from `/blog`, each "see all" button opens the right page, and the mobile menu closes after choosing a section, the contact button or a language.
