import {
  AgentChatRequest,
  AgentChatResponse,
  AgentResult,
  ChatTurn,
  ErrorTurn,
  ReplyTurn,
  StoredConversation,
  UserTurn,
} from './assistant';

// The model is types only: these fixtures fail to compile if a type or field of the plan's data
// model (Spec 001) is missing or renamed, and the tests check the unions narrow as intended.

const request: AgentChatRequest = {
  chat_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  mensaje: 'Hi',
};
const response: AgentChatResponse = { respuesta: 'Hello' };
const user: UserTurn = { id: 'u1', role: 'user', text: 'Hi' };
const reply: ReplyTurn = {
  id: 'a1',
  role: 'assistant',
  kind: 'reply',
  text: '**Hi**',
  animate: false,
};
const apiError: ErrorTurn = {
  id: 'e1',
  role: 'assistant',
  kind: 'error',
  reason: 'api',
  text: 'Unavailable',
  retryOf: 'u1',
};
const interrupted: ErrorTurn = {
  id: 'e2',
  role: 'assistant',
  kind: 'error',
  reason: 'interrupted',
  retryOf: 'u1',
};

/** The text a turn shows, reached only through the discriminants. */
function label(turn: ChatTurn): string {
  if (turn.role === 'user') return `user:${turn.text}`;
  return turn.kind === 'reply' ? `reply:${turn.text}` : `error:${turn.reason}:${turn.retryOf}`;
}

function resultText(result: AgentResult): string {
  if (result.ok) return result.text;
  return result.reason === 'api' ? result.text : result.reason;
}

describe('assistant model', () => {
  it('keeps the field names of the agent API contract', () => {
    expect(Object.keys(request)).toEqual(['chat_id', 'mensaje']);
    expect(Object.keys(response)).toEqual(['respuesta']);
  });

  it('narrows a turn by its role and kind', () => {
    expect([user, reply, apiError, interrupted].map(label)).toEqual([
      'user:Hi',
      'reply:**Hi**',
      'error:api:u1',
      'error:interrupted:u1',
    ]);
  });

  it('carries text in a failed result only for an API error', () => {
    const results: AgentResult[] = [
      { ok: true, text: 'Hello' },
      { ok: false, reason: 'api', text: 'Unavailable' },
      { ok: false, reason: 'generic' },
      { ok: false, reason: 'timeout' },
    ];

    expect(results.map(resultText)).toEqual(['Hello', 'Unavailable', 'generic', 'timeout']);
  });

  it('does not accept text on a failure other than an API error', () => {
    // @ts-expect-error Only an API error carries the agent's text.
    const invalid: AgentResult = { ok: false, reason: 'generic', text: 'Unavailable' };

    expect(invalid.ok).toBe(false);
  });

  it('stores a versioned conversation', () => {
    const empty: StoredConversation = { version: 1, chatId: null, turns: [] };
    const stored: StoredConversation = {
      version: 1,
      chatId: request.chat_id,
      turns: [user, reply],
    };

    expect(empty.turns).toEqual([]);
    expect(stored.turns.map((turn) => turn.id)).toEqual(['u1', 'a1']);
  });
});
