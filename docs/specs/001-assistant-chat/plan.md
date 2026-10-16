# 001 — Assistant chat: plan

- Spec: [spec.md](./spec.md)
- Status: Draft
- Date: 2026-10-16

This plan covers how the spec will be built. It names the modules, the data model, the decisions
taken (each with the alternative that was dropped) and the test strategy. It contains no code.
Every part lists the RFs it covers. The matrix at the end checks that all 32 RFs are covered.

## Starting point

These facts about the current code shape the design:

- **Every internal link is a full page load.** `navigation.html` uses plain `href`, and
  `LanguageService` fixes the language for the life of the app. So the Angular app restarts on
  every navigation and on every language switch. Nothing kept only in memory survives a
  navigation.
- **The API URL is fixed at build time.** `core/config/api.ts` resolves `API_URL` from the
  `NG_API_URL` define that `scripts/ng.mjs` injects. If it is unset, it falls back to production.
- **nginx sends one CSP header for every response**, including the SSR pages it proxies to
  `:4000`. Its `connect-src` gets `__API_ORIGIN__`, which the `Dockerfile` replaces after checking
  that the value is a bare origin.
- **The project has no client-side Markdown library.** `MarkdownBody` shows HTML the main API has
  already rendered, and it bypasses the sanitizer on purpose (plan D5 of the content spec).
- **`ContactService` is the pattern for an HTTP service.** It calls `firstValueFrom(http.post)`
  and turns errors into user-facing text with `apiErrorText`.
- **`TestimonialDialog` is the pattern for a dialog.** It uses a native `<dialog>`, focuses the
  first field after render, and returns focus to the trigger when it closes.
- **Budgets:** the initial bundle has a 500 kB warning and component styles a 4 kB warning.

## Prerequisites (outside the code)

| #   | Prerequisite                                                                                                                                                            | Why                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | The agent API answers the CORS preflight for `POST /chat` with `Content-Type: application/json`, from `https://marco.figueroa-sanchez.com` and `http://localhost:4200`. | Today `OPTIONS /chat` returns 405, so the browser cannot call the agent (RF-27). |
| P2  | Constitution §6 is amended so that `AGENT_URL` is allowed as a second public, non-secret build variable.                                                                | §6 now allows only `API_URL` (RF-30).                                            |
| P3  | The `AGENT_URL` value is set for CI and release, as a repository variable or secret, like `API_URL`.                                                                    | `release.yaml` passes `API_URL` to the build and to the images (RF-30, RF-31).   |

## Modules

### M1 — Configuration: `core/config/agent.ts` (+ spec)

This file resolves `AGENT_URL` from a new `NG_AGENT_URL` define. It uses the same normalization
as `api.ts`: trim the value and drop trailing slashes. An unset or blank value falls back to
`https://agent.figueroa-sanchez.com`. Locally, `.env` sets `AGENT_URL=http://localhost:8000`.

**Covers:** RF-30.

### M2 — Infra wiring (needs approval: `scripts/`, `Dockerfile`, `nginx.conf`, workflows)

- **`scripts/ng.mjs`:** also reads `AGENT_URL` and adds `--define NG_AGENT_URL=…`, following the
  pattern it already uses for `API_URL`.
- **`.env.example`:** adds `AGENT_URL=http://localhost:8000`.
- **`nginx.conf`:** `connect-src 'self' __API_ORIGIN__ __AGENT_ORIGIN__`.
- **`Dockerfile`:** adds `ARG AGENT_URL` to both stages. It extracts the origin with the same perl
  check used for `API_URL` and replaces `__AGENT_ORIGIN__`. Because this header covers both the
  static and the SSR responses, one change is enough for both.
- **`release.yaml`:** passes `AGENT_URL` wherever it passes `API_URL` today, which is the build and
  both image builds.
- **`scripts/check-ssr-csp.sh`:** no change. It checks script hashes, not `connect-src`.
- **`AGENTS.md`:** documents `AGENT_URL` next to `API_URL`.

**Covers:** RF-30, RF-31.

### M3 — Data model: `core/interfaces/assistant.ts`

Defines the types listed under Data model below.

**Covers:** RF-10, RF-20, RF-26–RF-29.

### M4 — HTTP: `core/services/assistant.service.ts` (+ spec)

- Under constitution §5, this is the only new class that injects `HttpClient`.
- One method sends `{ chat_id, mensaje }` to `${AGENT_URL}/chat` and returns an `AgentResult`. It
  never throws.
- It aborts the request after 30 s. Unsubscribing cancels the underlying fetch.
- It maps every outcome to an `AgentResult`:
  - `200` with a non-empty string `respuesta` → `ok`.
  - `500` or `503` with a non-empty `respuesta` → `api`, carrying that text.
  - Anything else → `generic`. That includes `422`, other statuses, status 0 (network or CORS),
    and a missing or non-string `respuesta`.
  - Timeout → `timeout`.

**Covers:** RF-10, RF-26, RF-27, RF-28.

### M5 — Conversation state: `core/services/assistant-conversation.service.ts` (+ spec)

This is a root signal store and the single source of truth for the chat. It has no HTTP code of
its own.

**State (signals):**

- `chatId`
- `turns`
- `pending` (one request in flight or not)
- `revealing` (the id of the reply being revealed)

**Actions:**

- `send(text)`:
  - Validates the text with M6.
  - Creates `chatId` on the first message, using `crypto.randomUUID()`.
  - Adds the user turn, calls M4, then adds a reply or an error turn.
  - Does nothing while `pending` is set.
- `retry(errorId)`: removes the error turn and sends the same text again with the same `chatId`.
  It does not add a new user turn.
- `reset()`:
  - Cancels any request in flight by bumping a conversation generation number, so a late reply
    is dropped.
  - Clears `chatId` and `turns`, and clears what is stored.

**Persistence:**

- On every change, the store writes a `StoredConversation` to `sessionStorage` under the key
  `assistant.conversation.v1`.
- It restores that value when the app starts.
- Storage comes from an `ASSISTANT_STORAGE` injection token:
  - It is `null` on the server.
  - It is `null` when `sessionStorage` throws.
  - In that case the store keeps working in memory only.

**Restore rules:**

- A stored reply is always shown in full and never animated again.
- If the last stored turn is a user message with no reply, it was cut off by a navigation. The
  store adds an `interrupted` error turn after it, which offers Retry (see D9).

**Panel closed:** because the store is root-scoped, closing the panel neither cancels nor drops a
request. When the panel reopens, the reply is shown in full: the store marks a reply as `animate`
only while the panel is open.

**Covers:** RF-13, RF-20–RF-25, RF-29.

### M6 — Validation: `core/utils/chat-validation.ts` (+ spec)

Defines `MAX_MESSAGE_LENGTH = 2000` and trims the text. It reports whether the text can be sent,
how many characters it has, and whether it is too long. This mirrors the API's `minLength: 1` and
`maxLength: 2000`.

**Covers:** RF-11, RF-12.

### M7 — Markdown: `core/utils/chat-markdown.ts` (+ spec)

A small renderer with no dependencies. It handles only the subset in RF-17: paragraphs, line
breaks, `**bold**`, `*italic*`, inline `code`, fenced code blocks, `-`/`1.` lists and
`[text](url)` links.

**Safe by design:**

- It HTML-escapes the whole input first. Only then does it turn the recognised markers into a
  fixed set of tags.
- Links keep only `http:`, `https:` and `mailto:`. Any other scheme is rendered as text. Every
  link gets `target="_blank"` and `rel="noopener noreferrer"`.
- An unclosed marker, which can happen in the middle of a reveal, stays literal text.
- The output goes into the template through `[innerHTML]` _without_ `bypassSecurityTrustHtml`.
  That way Angular's sanitizer is a second layer, unlike `MarkdownBody`.

**Covers:** RF-17.

### M8 — Reveal: `core/utils/word-reveal.ts` (+ spec)

Pure functions. One splits a text into word tokens and keeps the whitespace, so a revealed prefix
keeps its line breaks and Markdown structure. Another returns how many words to add per tick for
a given total.

- Base pace: about 35 ms per word.
- Long replies speed up so that any reply finishes in 4 s or less.
- Both are named constants, so they are easy to tune.

**Covers:** RF-14.

### M9 — UI components, under `src/app/components/`

**`assistant/`: launcher and panel container**

- **Launcher:** a fixed button at the bottom right. It has an accessible name and a visible focus.
- **Panel:** a native `<dialog>` opened with `show()`, non-modal (see D6), with
  `aria-labelledby` pointing to its title.
  - **Header:** title, "New conversation" and close.
  - **Thread:** the welcome block or the turns.
  - **Composer.**
- **Opening:** focuses the composer once rendered, as in `TestimonialDialog`.
- **Closing:** Escape or the close button closes the panel and focuses the launcher.
- **Layout with Tailwind:**
  - From `md` up: a floating window of about `w-96 h-[min(36rem,80dvh)]` above the button.
  - Below `md`: `inset-0 h-dvh`. Using `dvh` keeps the composer above the on-screen keyboard.
- **Auto-scroll:** a scroll listener tracks whether the thread is "near the bottom". After each
  render the thread scrolls to the end only in that case.
- **Live region:** one visually hidden `aria-live="polite"` region gets the plain text of a reply
  once its reveal ends, or right away if there is no animation.
- **Covers:** RF-01, RF-03–RF-09, RF-18, RF-19, RF-23.

**`assistant-message/`: one turn**

- A user turn is plain text.
- A reply is the M7 Markdown output. While it is being revealed it shows the M8 prefix and a
  "Show full answer" control.
- Under reduced motion, read once with `matchMedia('(prefers-reduced-motion: reduce)')` at the
  start of the reveal, the reply appears in full straight away.
- An error turn has its own style.
  - It shows the API text as plain text, not Markdown, or the dictionary text for its reason.
  - It has a Retry button, disabled while `pending`.
- **Covers:** RF-14–RF-17, RF-26–RF-29.

**`assistant-composer/`: the input**

- A `textarea` with a character counter.
- Enter sends the message; Shift+Enter inserts a line break.
- The send button is disabled when M6 says the text cannot be sent, or while `pending`.
- Over the limit, it shows the dictionary text that names the limit.
- **Covers:** RF-10–RF-13.

**Thinking indicator:** while `pending`, the thread ends with three animated dots that have an
accessible label. Under reduced motion the dots do not move.

**Covers:** RF-13.

### M10 — Mounting: `app.html`

`@defer (on idle) { <app-assistant /> }` is added after the footer, with no placeholder.

- The assistant is on every page, including `/es` and the not-found page.
- It stays out of the initial bundle.
- It is absent from the prerendered and SSR HTML, so it adds no inline script and needs no CSP
  hash.

**Covers:** RF-01, RF-02, non-functional (bundle).

### M11 — Texts: `messages.en.ts` / `messages.es.ts`

A new `assistant` block holds:

- the launcher label, panel title, placeholder and send label;
- "New conversation", close, "Show full answer" and Retry;
- the counter and limit text, and the thinking label;
- the greeting and three suggestions;
- the generic, timeout and interrupted error texts.

Since `Messages` is derived from `en`, a key missing in Spanish breaks the build.

**Covers:** RF-08, RF-27, RF-28, RF-32.

## Data model

| Type                 | Fields                                                                                                                     | Notes                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentChatRequest`   | `chat_id: string` (UUID), `mensaje: string`                                                                                | Wire contract. The field names stay exactly as the API defines them.                                                                                          |
| `AgentChatResponse`  | `respuesta: string`                                                                                                        | Wire contract, used for 200, 500 and 503.                                                                                                                     |
| `AgentResult`        | `{ ok: true; text }` \| `{ ok: false; reason: 'api' \| 'generic' \| 'timeout'; text?: string }`                            | What M4 returns. `text` is present only when `reason` is `api`.                                                                                               |
| `UserTurn`           | `id`, `role: 'user'`, `text`                                                                                               | `text` is already trimmed.                                                                                                                                    |
| `ReplyTurn`          | `id`, `role: 'assistant'`, `kind: 'reply'`, `text` (Markdown), `animate: boolean`                                          | `animate` is never persisted. A restored reply always has `false`.                                                                                            |
| `ErrorTurn`          | `id`, `role: 'assistant'`, `kind: 'error'`, `reason: 'api' \| 'generic' \| 'timeout' \| 'interrupted'`, `text?`, `retryOf` | `retryOf` is the `UserTurn.id` that Retry resends. Only `api` stores text; every other reason is turned into text at render time, in the page language.       |
| `ChatTurn`           | `UserTurn \| ReplyTurn \| ErrorTurn`                                                                                       | A discriminated union.                                                                                                                                        |
| `StoredConversation` | `version: 1`, `chatId: string \| null`, `turns: ChatTurn[]`                                                                | Saved in `sessionStorage` under `assistant.conversation.v1`. A value that fails to parse, or has an unknown `version`, is dropped and the store starts empty. |

Invariants:

- There is never more than one request in flight.
- `chatId` is `null` exactly when `turns` is empty.
- An `ErrorTurn` always directly follows the `UserTurn` it retries.

## Decisions

| #   | Decision                                                                                                                   | Dropped alternative and why                                                                                                                                                                                                           | RF                  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| D1  | The word-by-word effect runs in the client, on the full reply, with an adaptive pace capped at 4 s.                        | **SSE streaming:** the API does not offer it, and it is out of scope. **Fixed pace:** a long reply would take too long.                                                                                                               | RF-14               |
| D2  | Direct call to `AGENT_URL`, a build-time define like `API_URL`.                                                            | **Proxy through `src/server.ts` or the main API:** the user rejected it, and it would put the prerendered home behind the SSR server. **Runtime config (`/config.json`):** one extra request, and a different pattern from `API_URL`. | RF-30               |
| D3  | `sessionStorage` behind an injectable token, falling back to memory.                                                       | **Memory only:** every link is a full page load, so the conversation would be lost on each navigation. **`localStorage`:** it outlives the tab, against RF-22.                                                                        | RF-21, RF-22, RF-24 |
| D4  | Keep HTTP (M4) separate from state (M5).                                                                                   | **One service doing both:** §5 limits `HttpClient` to services, which this satisfies. But splitting lets M5 be tested with a fake M4, and M4 with `HttpTestingController`, with no timers mixed in.                                   | RF-10, RF-20–RF-29  |
| D5  | M4 returns an `AgentResult` and never throws.                                                                              | **`ContactService` style (throwing an `Error` with the text):** a string cannot tell a timeout from a generic error. It would also fix the text in one language, while a turn can be shown again after an EN↔ES switch.               | RF-26–RF-28         |
| D6  | Non-modal `<dialog>.show()` at every size, with Escape and focus handled by the component. Below `md` it fills the screen. | **`showModal()` as in `TestimonialDialog`:** it makes the page inert, which goes against RF-05. Switching between modal and non-modal by breakpoint would close and reopen the dialog on resize.                                      | RF-04–RF-07         |
| D7  | Own escape-first Markdown subset, with Angular's sanitizer as a second layer.                                              | **`marked` + `DOMPurify`:** two new dependencies that need approval, plus extra bundle size, for a small subset. **Reusing `MarkdownBody`:** it expects HTML already rendered by the trusted main API, and it bypasses the sanitizer. | RF-17               |
| D8  | The reveal advances over source tokens and renders the Markdown prefix on each tick. Unclosed markers stay literal.        | **Revealing words of the rendered DOM with CSS or `Range`:** complex, fragile with lists and code blocks, and hard to test.                                                                                                           | RF-14, RF-15        |
| D9  | A user turn left without a reply (navigation mid-request) is restored with an `interrupted` error and Retry.               | **Silently drop the orphan turn:** the visitor would lose their question. **Resend it automatically:** the agent might have processed it already, and the visitor did not ask for it.                                                 | RF-21, RF-29        |
| D10 | `@defer (on idle)` in `app.html`, with no placeholder.                                                                     | **Eager import in `App`:** it adds to the initial bundle and renders on the server. **A static placeholder button:** it needs hydration, it does nothing until the chunk loads, and it adds markup to the prerendered HTML.           | RF-01, RF-02        |
| D11 | 500/503 `respuesta` is shown as plain text, not Markdown.                                                                  | **Rendering it as Markdown:** the text is a diagnostic message, and plain text is the smallest attack surface.                                                                                                                        | RF-26               |
| D12 | `crypto.randomUUID()` for `chat_id`.                                                                                       | **The `uuid` package:** a new dependency. The native API is available in secure contexts, which covers HTTPS and `localhost`.                                                                                                         | RF-20               |
| D13 | No E2E framework. Unit and component tests plus a manual checklist.                                                        | **Playwright:** a new dependency, plus CI changes, for one feature. If more interactive features come, this can be revisited in its own spec.                                                                                         | Done criteria       |

## Test strategy

All tests run with Vitest and jsdom and never touch the network. HTTP goes through
`HttpTestingController`, timers through Vitest fake timers, and `sessionStorage` and
`matchMedia` through stubs. Every spec file sits next to the file it tests (constitution §4).

| Spec file                                | Cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | RF                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `agent.spec.ts`                          | Unset or blank value falls back to production. Trailing slashes and spaces are trimmed. With no define, the build uses production.                                                                                                                                                                                                                                                                                                                                                                                                           | RF-30                                          |
| `assistant.service.spec.ts`              | Posts `{ chat_id, mensaje }` to `${AGENT_URL}/chat`. 200 → `ok`. 500 or 503 with `respuesta` → `api` with that text. 503 with an empty body, 422, 404, status 0 and a 200 without `respuesta` → `generic`. After 30 s → `timeout`, and the request is cancelled.                                                                                                                                                                                                                                                                             | RF-10, RF-26–RF-28                             |
| `chat-validation.spec.ts`                | Empty and whitespace-only cannot be sent. 1 and 2000 characters can. 2001 cannot. Length is counted after trimming.                                                                                                                                                                                                                                                                                                                                                                                                                          | RF-11, RF-12                                   |
| `chat-markdown.spec.ts`                  | `<script>`, `<img onerror>` and HTML entities come out escaped. `javascript:` and `data:` links become text. Bold, italic, inline code, code fences, lists and line breaks render. Links get `target`/`rel`. Unclosed markers stay literal. The output survives Angular's sanitizer with `target`/`rel` intact.                                                                                                                                                                                                                              | RF-17                                          |
| `word-reveal.spec.ts`                    | Joining the tokens gives back the source. Every prefix ends on a word boundary. The pace stays within the 4 s cap for very long texts.                                                                                                                                                                                                                                                                                                                                                                                                       | RF-14                                          |
| `assistant-conversation.service.spec.ts` | First send creates a UUID and later sends reuse it. A second send while `pending` is ignored. Retry resends the same text and `chatId` with no duplicate turn. `reset()` clears state and storage, and a late reply is dropped. State is persisted and restored. A restored reply has `animate: false`. A dangling user turn becomes `interrupted`. Storage that throws, or a `null` token, falls back to memory with no error. A corrupt or unknown-version value starts empty. A reply received while the panel is closed is not animated. | RF-13, RF-20–RF-25, RF-29                      |
| `assistant.spec.ts`                      | Launcher is present and has an accessible name. Opening focuses the composer. Escape and close focus the launcher. The dialog has `aria-labelledby`. Welcome and suggestions show only when empty, and a suggestion sends its text. "New conversation" brings the welcome back. The live region gets a reply once. Auto-scroll happens only near the bottom. Texts change with the language (`es`).                                                                                                                                          | RF-01, RF-03–RF-09, RF-18, RF-19, RF-23, RF-32 |
| `assistant-message.spec.ts`              | The reply reveals step by step under fake timers. "Show full answer" completes it. Reduced motion shows it in full at once. An error turn shows API text as plain text, or the dictionary text for `generic`, `timeout` and `interrupted`. Retry emits and is disabled while `pending`.                                                                                                                                                                                                                                                      | RF-14–RF-16, RF-26–RF-29                       |
| `assistant-composer.spec.ts`             | Enter submits and Shift+Enter does not. Send is disabled when empty, over the limit, or `pending`. Over the limit, the limit text shows.                                                                                                                                                                                                                                                                                                                                                                                                     | RF-10–RF-13                                    |
| `app.spec.ts` (existing)                 | The root still renders. The deferred block is declared.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | RF-01                                          |

Checks beyond unit tests:

- `pnpm build`:
  - No exceeded budgets.
  - The assistant ends up in a lazy chunk, not in `main`.
  - `dist/.../browser/index.html` and `es/index.html` contain no `app-assistant` markup (RF-02).
- `scripts/check-ssr-csp.sh` passes. No new inline scripts are added.
- `docker build --target static --build-arg AGENT_URL=…`: the rendered `nginx.conf` contains the
  agent origin in `connect-src`. An invalid `AGENT_URL` fails the build (RF-31).
- The manual checklist from the spec's done criteria, against the local agent with
  `AGENT_URL=http://localhost:8000`:
  - Timeouts and network errors are simulated with DevTools throttling and offline mode.
  - 503 is checked by stopping the agent's LLM backend.
  - Viewports at 375 px and 1280 px.
  - Keyboard-only use.
  - With reduced motion turned on in the OS.
- In production, after deploy: a message sent from `marco.figueroa-sanchez.com` gets a reply, and
  the console shows no CORS or CSP errors (needs P1).

## Order of work

1. **P2:** amend the constitution, and update `AGENTS.md` with `AGENT_URL`. Both need approval.
2. **M1** and **M2**: configuration and infra. This needs approval because it touches `scripts/`,
   the `Dockerfile`, `nginx.conf` and the workflows.
3. **M3**, **M6**, **M7** and **M8**: types and pure utils, test first.
4. **M4**, then **M5**, with their specs.
5. **M11**: the texts.
6. **M9** and **M10**: components and mounting, with their specs.
7. Manual checklist against the local agent. Then `pnpm test --watch=false`, `pnpm build`,
   `scripts/check-ssr-csp.sh` and `prettier --check`.
8. `chore(release): Bump version to v4.1.0` (minor, a new feature).
9. After deploy and P1: the production check.

## RF coverage matrix

| RF    | Modules        | Verified by                                                      |
| ----- | -------------- | ---------------------------------------------------------------- |
| RF-01 | M9, M10        | `assistant.spec`, `app.spec`, manual                             |
| RF-02 | M10            | build output check                                               |
| RF-03 | M9             | `assistant.spec`                                                 |
| RF-04 | M9             | `assistant.spec`                                                 |
| RF-05 | M9             | manual (1280 px)                                                 |
| RF-06 | M9             | manual (375 px, keyboard open)                                   |
| RF-07 | M9             | `assistant.spec`, manual (keyboard only)                         |
| RF-08 | M9, M11        | `assistant.spec`                                                 |
| RF-09 | M9             | `assistant.spec`                                                 |
| RF-10 | M3, M4, M5, M9 | `assistant.service.spec`, `assistant-composer.spec`              |
| RF-11 | M6, M9         | `chat-validation.spec`, `assistant-composer.spec`                |
| RF-12 | M6, M9         | `chat-validation.spec`, `assistant-composer.spec`                |
| RF-13 | M5, M9         | `assistant-conversation.service.spec`, `assistant-composer.spec` |
| RF-14 | M8, M9         | `word-reveal.spec`, `assistant-message.spec`                     |
| RF-15 | M9             | `assistant-message.spec`                                         |
| RF-16 | M9             | `assistant-message.spec`, manual                                 |
| RF-17 | M7, M9         | `chat-markdown.spec`                                             |
| RF-18 | M9             | `assistant.spec`, manual                                         |
| RF-19 | M9             | `assistant.spec`                                                 |
| RF-20 | M5             | `assistant-conversation.service.spec`                            |
| RF-21 | M5             | `assistant-conversation.service.spec`, manual                    |
| RF-22 | M5 (D3)        | manual (close tab)                                               |
| RF-23 | M5, M9         | `assistant-conversation.service.spec`, `assistant.spec`          |
| RF-24 | M5             | `assistant-conversation.service.spec`                            |
| RF-25 | M5             | `assistant-conversation.service.spec`                            |
| RF-26 | M4, M9         | `assistant.service.spec`, `assistant-message.spec`               |
| RF-27 | M4, M9, M11    | `assistant.service.spec`, `assistant-message.spec`               |
| RF-28 | M4, M9, M11    | `assistant.service.spec`, `assistant-message.spec`               |
| RF-29 | M5, M9         | `assistant-conversation.service.spec`, `assistant-message.spec`  |
| RF-30 | M1, M2         | `agent.spec`, build                                              |
| RF-31 | M2             | `docker build` check, production check                           |
| RF-32 | M11            | build (typed dictionaries), `assistant.spec`                     |

## Risks

- **CORS (P1) is outside this repo.** Until it is in place, production shows the generic error.
  Local work can go ahead, because FastAPI on `:8000` needs the same CORS setting for
  `localhost:4200`.
- **The on-screen keyboard on iOS Safari** does not always resize `dvh`. If the manual check at
  375 px fails, the fallback is `visualViewport` resize handling inside M9. This is still an
  implementation detail and does not change the spec.
- **Angular's sanitizer** might strip `target`/`rel`. The `chat-markdown` spec checks this. If it
  happens, M9 builds the DOM nodes itself instead of using `innerHTML`, and M7 stays the same.
