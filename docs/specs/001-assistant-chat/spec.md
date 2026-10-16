# 001 — Assistant chat

- Status: Approved
- Date: 2026-10-16
- Branch: feature/assistant

## Why

Visitors who want to know about Marco's experience, projects or availability today must read
the whole site or use the contact form. A conversational assistant, backed by Marco's personal
agent, answers those questions at once in the visitor's language. It also shows Marco's own
work on AI agents directly on the portfolio.

## What

A floating button, present on every page, opens a chat panel. The panel talks to the personal
assistant API (`POST {AGENT_URL}/chat`). The panel works as a floating window on desktop and full
screen on mobile, and reveals each answer word by word like an AI agent.

### External contract (as-is, not changed by this spec)

- `POST /chat` with `{ chat_id: UUID, mensaje: string (1–2000 chars) }`.
- `200 { respuesta: string }` (markdown). `500`/`503 { respuesta: string }`. `422` validation error.
- The API does not stream, so the word-by-word effect is produced by the client.
- Environments: local `http://localhost:8000`, production `https://agent.figueroa-sanchez.com`.

## Functional requirements (EARS)

### Launcher and panel

- **RF-01** The site shall show a floating assistant button anchored to the bottom-right corner
  of every page (home, projects, experience and blog) in English and under `/es`.
- **RF-02** The assistant shall not call the agent API during prerendering or server rendering.
  It becomes interactive only in the browser.
- **RF-03** When the visitor activates the floating button, the assistant shall open the chat
  panel and move focus to the message input.
- **RF-04** When the visitor presses Escape or the close control while the panel is open, the
  assistant shall close the panel and return focus to the floating button.
- **RF-05** Where the viewport is at least the `md` breakpoint, the panel shall be a floating
  window above the button that leaves the rest of the page visible.
- **RF-06** Where the viewport is narrower than `md`, the panel shall take the full screen and
  keep the message input visible while the on-screen keyboard is open.
- **RF-07** The panel shall be exposed as a labelled dialog. Every control shall have an
  accessible name and a visible focus.

### Empty conversation

- **RF-08** While the conversation is empty, the assistant shall show a greeting and two to three
  suggested questions in the UI language, taken from the i18n dictionaries, without calling the
  API.
- **RF-09** When the visitor selects a suggested question, the assistant shall send it as if the
  visitor had typed it.

### Sending a message

- **RF-10** When the visitor submits a message (Enter or the send control), the assistant shall
  show it in the thread at once and send it with the current `chat_id`. Shift+Enter inserts a
  line break.
- **RF-11** If the trimmed message is empty, then the assistant shall not send it, and the send
  control shall stay disabled.
- **RF-12** If the message is longer than 2000 characters, then the assistant shall block
  sending and show the length limit. Client validation mirrors the API's.
- **RF-13** While a reply is pending, the assistant shall show a "thinking" indicator and shall not
  accept another submission, so only one request is in flight at a time.

### Agent-style reply

- **RF-14** When a successful reply arrives, the assistant shall reveal it progressively, word
  by word.
- **RF-15** While a reply is being revealed, the assistant shall offer a control that shows the
  full reply at once.
- **RF-16** Where the visitor prefers reduced motion, the assistant shall show each reply in full
  without the progressive reveal.
- **RF-17** The assistant shall render replies as sanitized markdown (emphasis, lists, links,
  inline code and code blocks). It shall never execute HTML or scripts that come from the reply,
  and external links shall open in a new tab.
- **RF-18** While new content arrives or is revealed, the assistant shall keep the thread
  scrolled to the latest message, unless the visitor has scrolled up.
- **RF-19** When a reply has been fully revealed, the assistant shall announce it to assistive
  technologies once, not word by word.

### Conversation lifetime

- **RF-20** When the first message of a conversation is sent, the assistant shall generate a new
  UUID `chat_id`.
- **RF-21** While the browser tab stays open, the assistant shall keep the `chat_id` and the
  visible history across page navigations, language switches and reloads.
- **RF-22** When the tab is closed, the conversation shall be lost.
- **RF-23** When the visitor selects "New conversation", the assistant shall discard the
  `chat_id` and the history, cancel any pending request and show the empty conversation again.
- **RF-24** If tab storage is unavailable, then the assistant shall keep the conversation in
  memory only and keep working without showing an error.
- **RF-25** If the visitor closes the panel while a reply is pending, then the request shall
  continue. When the panel is reopened, the reply shall be in the thread, shown in full.

### Errors

- **RF-26** If the API answers `500` or `503` with a non-empty `respuesta`, then the assistant
  shall show that text in the thread as an error message, styled differently from a normal reply.
- **RF-27** If the request fails without a usable `respuesta` (any other status, a `422`, an
  invalid body, a network or CORS failure), then the assistant shall show the generic error text
  from the dictionary in the UI language. It shall never show raw bodies or stack traces.
- **RF-28** If no reply arrives within 30 seconds, then the assistant shall abort the request and
  show a generic timeout text from the dictionary.
- **RF-29** When an error is shown, the assistant shall offer a Retry control. Retry resends the
  same message with the same `chat_id` and does not duplicate it in the thread.

### Configuration

- **RF-30** The agent base URL shall come from a build-time variable `AGENT_URL`, provided the
  same way as `API_URL`. Its default is the production URL; local development points it to
  `http://localhost:8000` through `.env`.
- **RF-31** The Content Security Policy of both the static (nginx) and the SSR responses shall
  allow `connect-src` to the `AGENT_URL` origin, and to no other new origin.
- **RF-32** All assistant UI text (button label, placeholder, greeting, suggestions, errors,
  controls) shall exist in `messages.en.ts` and `messages.es.ts`.

## Non-functional requirements

- The assistant must not push the initial bundle over 500 kB. It is loaded so that it does not
  delay the first render of the page.
- Component styles stay under the 4 kB budget. Tailwind utilities first.
- No new dependency without prior approval. Markdown rendering reuses what the project already
  has where possible.
- Unit tests run without network (`HttpTestingController`). They cover the service, the reveal
  logic and every error branch.

## Dependencies and approvals

- **Agent API:** CORS must allow `POST` with `Content-Type: application/json` from
  `https://marco.figueroa-sanchez.com` and the local dev origin. This is a change outside this
  repo.
- **Constitution §6:** must be amended to allow `AGENT_URL` as a second public, non-secret
  variable. This needs approval (`docs/`).
- **Infra (needs approval):** the build variable wiring (`scripts/ng.mjs`), `Dockerfile` build
  arg, `nginx.conf` CSP, `scripts/check-ssr-csp.sh`, `.env.example` and the CI/release
  workflows that pass `API_URL`.

## Out of scope

- Real streaming (SSE/WebSocket) from the agent API.
- Sending the UI language or any other new field to the API, or any API change other than CORS.
- Server-side proxy for the agent, either through the SSR server or the main API.
- History that survives closing the tab, user accounts, or a list of past conversations.
- Attachments, images, voice input or output, and the Google Chat endpoint.
- Rate limiting and abuse protection. These belong to the agent API.
- Message editing, reply rating, analytics and a health pre-check before showing the button.

## Done criteria

- Every RF-01…RF-32 has been verified, by a unit test where it is logic, or manually where it is
  visual.
- Manual check against the local agent (`http://localhost:8000`):
  - send, reveal, skip and reduced motion;
  - 500/503 with `respuesta`, a generic error, the 30 s timeout and Retry;
  - "New conversation", and persistence across navigation, reload and EN↔ES;
  - desktop at 1280 px and mobile at 375 px, with the keyboard open;
  - keyboard-only use with Escape and focus return.
- In production, a message sent from `marco.figueroa-sanchez.com` gets a reply without CORS or CSP
  errors in the console.
- `pnpm test --watch=false`, `pnpm build` (no exceeded budgets) and `scripts/check-ssr-csp.sh`
  pass, and `pnpm exec prettier --check` is clean on the touched files.
- The constitution amendment is approved and merged.
- `version` is bumped as a minor (feat) in a `chore(release)` commit.
