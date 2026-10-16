# 001 — Assistant chat: tasks

- Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md)
- Date: 2026-10-16

Tasks are listed in dependency order. A task starts only when everything in its **Depends on**
line is checked. Tasks marked 🔒 need explicit approval first (AGENTS.md rules; all of them
approved on 2026-10-16), and 🌐 marks
work outside this repo. Every test task follows the same loop: write the spec first, see it fail,
then implement.

## Phase 0 — Prerequisites

- [x] **T01 🔒 Amend the constitution and AGENTS.md (P2)**
  - Covers RF-30.
  - Depends on: —
  - Work:
    - §6 of `docs/constitution.md` allows `AGENT_URL` as a second public, non-secret build
      variable.
    - `AGENTS.md` documents `AGENT_URL` next to `API_URL` (project and commands).
  - Hecho cuando: §6 names `API_URL` and `AGENT_URL`, `AGENTS.md` mentions `AGENT_URL`, the
    change is approved, and `pnpm exec prettier --check docs AGENTS.md` is clean.

- [x] **T02 🌐 Enable CORS on the agent API (P1)**
  - Covers RF-27 and RF-31.
  - Depends on: —
  - Runs in parallel with everything else. It only blocks T18 and T21.
  - Work: the agent API (v3.3.0) already reads its allowed origins from the `cors_origins` table,
    so no code changes. Register the origins as rows:
    - `https://marco.figueroa-sanchez.com`, locally and in production.
    - `http://localhost:4200`, locally only. The dev server does not call the production agent.
  - Hecho cuando: a preflight `curl -X OPTIONS` to `/chat` with `Origin` and
    `Access-Control-Request-Method: POST` gets a 200 with `Access-Control-Allow-Origin` set to
    that origin, for both origins on `:8000` and for the site origin in production.

## Phase 1 — Configuration and infra

- [x] **T03 Agent URL config: `core/config/agent.ts` (M1)**
  - Covers RF-30.
  - Depends on: T01
  - Hecho cuando: `agent.spec.ts` passes. It covers unset and blank values falling back to
    production, trimmed spaces and trailing slashes, and production being used when there is no
    define.

- [x] **T04 🔒 Build define and env example (M2)**
  - Covers RF-30.
  - Depends on: T03
  - Work:
    - `scripts/ng.mjs` passes `NG_AGENT_URL` when `AGENT_URL` is set.
    - `.env.example` adds `AGENT_URL=http://localhost:8000`.
  - Hecho cuando:
    - running `scripts/ng.mjs` against a stubbed Angular CLI shows that it passes
      `--define NG_AGENT_URL="…"` when `AGENT_URL` is set (from the environment or `.env`, with the
      environment winning), passes nothing when it is unset or blank, and still passes `NG_API_URL`;
    - `AGENT_URL=http://localhost:8000 pnpm build` succeeds.
  - Note: nothing imports `AGENT_URL` until T11, so the build drops it and the URL cannot be found
    in `dist` yet. That check moved to T17.

- [x] **T05 🔒 CSP origin in nginx and Docker (M2)**
  - Covers RF-31.
  - Depends on: T01
  - Work:
    - `nginx.conf` sets `connect-src 'self' __API_ORIGIN__ __AGENT_ORIGIN__`.
    - The `Dockerfile` has `ARG AGENT_URL` in both stages and validates the origin with the same
      perl check as `API_URL`.
  - Hecho cuando:
    - `docker build --target static --build-arg AGENT_URL=https://agent.figueroa-sanchez.com .`
      gives an image whose `nginx.conf` has `connect-src 'self' https://api.figueroa-sanchez.com
https://agent.figueroa-sanchez.com`.
    - `--build-arg AGENT_URL=javascript:alert(1)` fails the build with `invalid AGENT_URL`.

- [x] **T06 🔒 Release workflow (M2, P3)**
  - Covers RF-30 and RF-31.
  - Depends on: T04, T05
  - Work: `release.yaml` passes `AGENT_URL` wherever it passes `API_URL`: the build step and
    both image builds.
  - Hecho cuando: `grep -c AGENT_URL .github/workflows/release.yaml` is at least 3, and
    `AGENT_URL` exists as a repository variable or secret (`gh variable list` or
    `gh secret list`).

## Phase 2 — Model and pure utils

- [x] **T07 Data model: `core/interfaces/assistant.ts` (M3)**
  - Covers RF-10, RF-20 and RF-26–RF-29.
  - Depends on: —
  - Work: add `AgentChatRequest`, `AgentChatResponse`, `AgentResult`, `UserTurn`, `ReplyTurn`,
    `ErrorTurn`, `ChatTurn` and `StoredConversation`, as in the plan's data model.
  - Hecho cuando: every type and field in the plan's data model table exists with the same name,
    and `pnpm build` passes.

- [x] **T08 Message validation: `core/utils/chat-validation.ts` (M6)**
  - Covers RF-11 and RF-12.
  - Depends on: —
  - Hecho cuando: `chat-validation.spec.ts` passes. Empty and whitespace-only text is blocked,
    1 and 2000 characters are allowed, 2001 is blocked, and length is measured after trimming.

- [x] **T09 Safe Markdown subset: `core/utils/chat-markdown.ts` (M7)**
  - Covers RF-17.
  - Depends on: —
  - Hecho cuando: `chat-markdown.spec.ts` passes. It checks that:
    - `<script>` and `<img onerror>` come out escaped;
    - `javascript:` and `data:` links become plain text;
    - bold, italic, inline code, code fences, lists and line breaks render;
    - links carry `target="_blank" rel="noopener noreferrer"`, and both survive Angular's
      sanitizer;
    - unclosed markers stay literal.

- [x] **T10 Word reveal: `core/utils/word-reveal.ts` (M8)**
  - Covers RF-14.
  - Depends on: —
  - Hecho cuando: `word-reveal.spec.ts` passes. Joining the tokens rebuilds the source, every
    prefix ends on a word boundary, and a 2000-word text finishes within the 4 s cap.

## Phase 3 — Services

- [x] **T11 HTTP service: `core/services/assistant.service.ts` (M4)**
  - Covers RF-10 and RF-26–RF-28.
  - Depends on: T03, T07
  - Hecho cuando: `assistant.service.spec.ts` passes with `HttpTestingController`:
    - the body `{ chat_id, mensaje }` is sent to `${AGENT_URL}/chat`;
    - 200 gives `ok`;
    - 500 or 503 with a `respuesta` gives `api` carrying that text;
    - 503 with an empty body, 422, 404, status 0 and a 200 without `respuesta` give `generic`;
    - 30 s with fake timers gives `timeout`, and the request is reported cancelled.

- [x] **T12 Conversation store: `core/services/assistant-conversation.service.ts` and
      `ASSISTANT_STORAGE` (M5)**
  - Covers RF-13 and RF-20–RF-25, RF-29.
  - Depends on: T07, T08, T11
  - Hecho cuando: `assistant-conversation.service.spec.ts` passes, using a fake
    `AssistantService` and a storage stub. It covers:
    - the first send creates a UUID, which later sends reuse;
    - a send while `pending` is ignored;
    - Retry resends the same text and `chatId` without duplicating the turn;
    - `reset()` clears state and storage, and a late reply is dropped;
    - the conversation persists and restores, and a restored reply has `animate: false`;
    - a dangling user turn becomes `interrupted`;
    - storage that throws, or `null` storage, falls back to memory;
    - a corrupt or unknown-version value starts empty;
    - a reply received while the panel is closed is not animated.

## Phase 4 — Texts and UI

- [ ] **T13 i18n texts: `assistant` block in `messages.en.ts` and `messages.es.ts` (M11)**
  - Covers RF-08, RF-27, RF-28 and RF-32.
  - Depends on: —
  - Work: add the launcher label, title, placeholder, send, "New conversation", close, "Show
    full answer", Retry, counter and limit, thinking label, greeting, three suggestions, and the
    generic, timeout and interrupted errors.
  - Hecho cuando: both dictionaries have the same `assistant` keys, and `pnpm build` passes.
    Removing a key from `es` must make the build fail.

- [ ] **T14 Composer: `components/assistant-composer/` (M9)**
  - Covers RF-10–RF-13.
  - Depends on: T08, T13
  - Hecho cuando: `assistant-composer.spec.ts` passes. Enter submits and Shift+Enter does not.
    Send is disabled when the text is empty, over the limit, or while a reply is pending. The
    limit text shows when the text is over the limit.

- [ ] **T15 Message bubble: `components/assistant-message/` (M9)**
  - Covers RF-14–RF-17 and RF-26–RF-29.
  - Depends on: T09, T10, T13
  - Hecho cuando: `assistant-message.spec.ts` passes. It checks that:
    - a reply reveals step by step with fake timers;
    - "Show full answer" completes it;
    - with a reduced-motion `matchMedia` stub, the reply shows in full at once;
    - an error shows API text as plain text, or the dictionary text for `generic`, `timeout` and
      `interrupted`;
    - Retry emits, and is disabled while a reply is pending.

- [ ] **T16 Launcher and panel: `components/assistant/` (M9)**
  - Covers RF-01, RF-03–RF-09, RF-13, RF-18, RF-19 and RF-23.
  - Depends on: T12, T14, T15
  - Hecho cuando: `assistant.spec.ts` passes. It checks that:
    - the launcher has an accessible name;
    - opening focuses the composer, and Escape or close return focus to the launcher;
    - the `<dialog>` has `aria-labelledby`;
    - the welcome and suggestions show only while the conversation is empty, and a suggestion
      sends its text;
    - the thinking indicator shows while a reply is pending;
    - "New conversation" brings the welcome back;
    - the live region is set once per reply;
    - auto-scroll happens only near the bottom;
    - the texts follow `es`.

- [ ] **T17 Mount on every page: `@defer (on idle)` in `app.html` (M10)**
  - Covers RF-01 and RF-02.
  - Depends on: T16
  - Hecho cuando:
    - `pnpm build` passes within budgets, and the assistant is in a lazy chunk, not `main`;
    - `grep -L app-assistant dist/devsonic.cl/browser/index.html
dist/devsonic.cl/browser/es/index.html` lists both files;
    - `scripts/check-ssr-csp.sh` passes;
    - `app.spec.ts` passes;
    - after `AGENT_URL=http://localhost:8000 pnpm build`, `grep -r "localhost:8000"
dist/devsonic.cl/browser` finds it, and after a plain `pnpm build`,
      `grep -r "agent.figueroa-sanchez.com" dist/devsonic.cl/browser` finds it (moved from T04).

## Phase 5 — Verification and release

- [ ] **T18 Manual checklist against the local agent**
  - Covers RF-01–RF-32.
  - Depends on: T02 (local CORS), T04, T17
  - Setup: `.env` with `AGENT_URL=http://localhost:8000`, then `pnpm start`.
  - Hecho cuando: every item below is checked.
    - [ ] Send a message: the reply reveals word by word, and "Show full answer" completes it
          (RF-10, RF-14, RF-15).
    - [ ] With reduced motion on in the OS, the reply appears in full (RF-16).
    - [ ] A reply with Markdown renders: lists, code and an external link opening in a new tab
          (RF-17).
    - [ ] Scrolled up during a reveal, the thread is not pulled down. At the bottom, it follows
          (RF-18).
    - [ ] A screen reader (VoiceOver) announces the reply once (RF-19).
    - [ ] 503 with the agent's LLM backend stopped shows the API `respuesta` (RF-26).
    - [ ] Offline in DevTools shows the generic error, and Retry works (RF-27, RF-29).
    - [ ] A reply delayed past 30 s with throttling shows the timeout text (RF-28).
    - [ ] Navigate, reload and switch EN↔ES: the history and `chat_id` are kept (RF-21).
    - [ ] Navigate during a pending reply: it is restored with "interrupted" and Retry (RF-21,
          RF-29).
    - [ ] Close the tab and reopen the site: the conversation is empty (RF-22).
    - [ ] "New conversation" clears the thread and starts a new `chat_id`, visible in the
          request payload (RF-20, RF-23).
    - [ ] Close the panel during a pending reply and reopen it: the reply is there in full
          (RF-25).
    - [ ] At 1280 px, the panel floats and the page stays visible and usable (RF-05).
    - [ ] At 375 px, the panel is full screen, and the composer stays visible with the keyboard
          open (RF-06).
    - [ ] Keyboard only: Tab reaches every control with a visible focus, and Escape closes the
          panel and returns focus (RF-04, RF-07).
    - [ ] Empty conversation shows the greeting and suggestions in EN and ES, and a suggestion
          sends (RF-08, RF-09, RF-32).

- [ ] **T19 Quality gate**
  - Covers all RFs.
  - Depends on: T06, T17, T18
  - Hecho cuando:
    - `pnpm test --watch=false`, `pnpm build` (no exceeded budgets) and
      `scripts/check-ssr-csp.sh` exit 0;
    - `pnpm exec prettier --check` is clean on every touched file.

- [ ] **T20 Version bump**
  - Covers: —
  - Depends on: T19
  - Hecho cuando: `package.json` has `"version": "4.1.0"`, committed as
    `chore(release): Bump version to v4.1.0`.

- [ ] **T21 🌐 Production check after deploy**
  - Covers RF-27 and RF-31.
  - Depends on: T02, T06, T20 (merged and deployed)
  - Hecho cuando:
    - on `https://marco.figueroa-sanchez.com` and `/es`, a message gets a reply;
    - the browser console shows no CORS or CSP errors;
    - the response's `Content-Security-Policy` header includes
      `https://agent.figueroa-sanchez.com` in `connect-src`.

## Dependency graph

```text
T01 ─┬─ T03 ─┬─ T04 ─┐
     │       └───────┼──────────── T11 ─┐
     └─ T05 ─────────┴─ T06 ─────────────┼──────────────────── T19 ─ T20 ─ T21
T07 ───────────────────────────── T11    │                      ▲            ▲
T07, T08, T11 ─────────────────── T12 ─┐ │                      │            │
T08, T13 ──────────────────────── T14 ─┼─ T16 ─ T17 ─ T18 ──────┘            │
T09, T10, T13 ─────────────────── T15 ─┘                ▲                    │
T02 (external) ─────────────────────────────────────────┴────────────────────┘
```

## RF coverage

| RF          | Tasks                   |
| ----------- | ----------------------- |
| RF-01       | T16, T17, T18           |
| RF-02       | T17                     |
| RF-03–RF-04 | T16, T18                |
| RF-05–RF-06 | T16, T18                |
| RF-07       | T16, T18                |
| RF-08–RF-09 | T13, T16, T18           |
| RF-10       | T07, T11, T14, T18      |
| RF-11–RF-12 | T08, T14                |
| RF-13       | T12, T14, T16           |
| RF-14       | T10, T15, T18           |
| RF-15–RF-16 | T15, T18                |
| RF-17       | T09, T15, T18           |
| RF-18–RF-19 | T16, T18                |
| RF-20       | T07, T12, T18           |
| RF-21–RF-22 | T12, T18                |
| RF-23       | T12, T16, T18           |
| RF-24–RF-25 | T12, T18                |
| RF-26       | T07, T11, T15, T18      |
| RF-27       | T02, T11, T13, T15, T21 |
| RF-28       | T11, T13, T15, T18      |
| RF-29       | T07, T12, T15, T18      |
| RF-30       | T01, T03, T04, T06      |
| RF-31       | T05, T06, T21           |
| RF-32       | T13, T16, T18           |
