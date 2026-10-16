// Personal assistant chat (Spec 001). The wire types keep the agent API's own field names.

/** Body of `POST {AGENT_URL}/chat`. */
export interface AgentChatRequest {
  /** UUID of the conversation, created by the client (RF-20). */
  chat_id: string;
  /** The visitor's message, 1–2000 characters once trimmed. */
  mensaje: string;
}

/** Body of a 200, and of a 500/503 from the agent (RF-26). */
export interface AgentChatResponse {
  /** Markdown on success; a diagnostic text on 500/503. */
  respuesta: string;
}

/** Why a request failed: the agent's own text, anything else, or no answer in time. */
export type AgentFailure = 'api' | 'generic' | 'timeout';

/** Outcome of one request; the service never throws (plan D5). */
export type AgentResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'api'; text: string }
  | { ok: false; reason: Exclude<AgentFailure, 'api'> };

export interface UserTurn {
  id: string;
  role: 'user';
  /** Already trimmed. */
  text: string;
}

export interface ReplyTurn {
  id: string;
  role: 'assistant';
  kind: 'reply';
  /** Markdown, rendered with the safe subset (RF-17). */
  text: string;
  /** Revealed word by word; a restored reply is always `false` (RF-14, RF-25). */
  animate: boolean;
}

export interface ErrorTurn {
  id: string;
  role: 'assistant';
  kind: 'error';
  /** `interrupted`: the page changed before the reply arrived (plan D9). */
  reason: AgentFailure | 'interrupted';
  /** The agent's text, only for `api`; the other reasons are shown in the page language. */
  text?: string;
  /** The `UserTurn` that Retry sends again (RF-29). */
  retryOf: string;
}

export type ChatTurn = UserTurn | ReplyTurn | ErrorTurn;

/** What `sessionStorage` keeps for the tab (RF-21); an unknown `version` is discarded. */
export interface StoredConversation {
  version: 1;
  /** `null` exactly when `turns` is empty. */
  chatId: string | null;
  turns: ChatTurn[];
}
