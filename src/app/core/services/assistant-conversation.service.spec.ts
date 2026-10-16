import { TestBed } from '@angular/core/testing';
import { AgentResult, StoredConversation } from '../interfaces/assistant';
import {
  ASSISTANT_STORAGE,
  ASSISTANT_STORAGE_KEY,
  AssistantConversationService,
  AssistantStorage,
} from './assistant-conversation.service';
import { AssistantService } from './assistant.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** In-memory `sessionStorage` stand-in. */
class MemoryStorage implements AssistantStorage {
  public readonly data = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  public removeItem(key: string): void {
    this.data.delete(key);
  }
  public stored(): StoredConversation | null {
    const raw = this.data.get(ASSISTANT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredConversation) : null;
  }
}

/** Storage that throws on every call, like a browser with storage blocked. */
const BLOCKED: AssistantStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
  removeItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
};

/** Fake agent: each `send` waits until the test answers it. */
class FakeAssistant {
  public readonly calls: { chatId: string; message: string; answer: (r: AgentResult) => void }[] =
    [];
  public send(chatId: string, message: string): Promise<AgentResult> {
    return new Promise((answer) => this.calls.push({ chatId, message, answer }));
  }
  public last() {
    return this.calls[this.calls.length - 1];
  }
}

/** Lets awaited promises inside the store settle. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('AssistantConversationService', () => {
  let storage: AssistantStorage | null;
  let agent: FakeAssistant;

  function create(): AssistantConversationService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AssistantService, useValue: agent },
        { provide: ASSISTANT_STORAGE, useValue: storage },
      ],
    });
    return TestBed.inject(AssistantConversationService);
  }

  async function reply(store: AssistantConversationService, result: AgentResult): Promise<void> {
    agent.last().answer(result);
    await settle();
    expect(store.pending()).toBe(false);
  }

  beforeEach(() => {
    storage = new MemoryStorage();
    agent = new FakeAssistant();
  });

  describe('sending', () => {
    it('creates a chat id on the first message and reuses it afterwards (RF-20)', async () => {
      const store = create();
      expect(store.chatId()).toBeNull();

      expect(store.send('  What does Marco work on?  ')).toBe(true);
      const chatId = store.chatId();
      expect(chatId).toMatch(UUID);
      expect(agent.last()).toMatchObject({ chatId, message: 'What does Marco work on?' });
      await reply(store, { ok: true, text: 'He builds web apps.' });

      store.send('And his stack?');
      expect(agent.last().chatId).toBe(chatId);
    });

    it('shows the trimmed message at once and the pending state until the reply (RF-10, RF-13)', async () => {
      const store = create();
      store.send('  Hi  ');

      expect(store.turns()).toEqual([{ id: expect.any(String), role: 'user', text: 'Hi' }]);
      expect(store.pending()).toBe(true);
      await reply(store, { ok: true, text: 'Hello!' });
      expect(store.turns().map((turn) => turn.role)).toEqual(['user', 'assistant']);
    });

    it('does not send blank or over-long messages (RF-11, RF-12)', () => {
      const store = create();

      expect(store.send('   ')).toBe(false);
      expect(store.send('a'.repeat(2001))).toBe(false);
      expect(agent.calls).toEqual([]);
      expect(store.turns()).toEqual([]);
      expect(store.chatId()).toBeNull();
    });

    it('ignores a send while a reply is pending (RF-13)', () => {
      const store = create();
      store.send('First');

      expect(store.send('Second')).toBe(false);
      expect(agent.calls.length).toBe(1);
      expect(store.turns().length).toBe(1);
    });

    it('animates a reply only while the panel is open (RF-14, RF-25)', async () => {
      const store = create();
      store.setOpen(true);
      store.send('Open');
      await reply(store, { ok: true, text: 'Shown word by word' });

      store.setOpen(false);
      store.send('Closed');
      await reply(store, { ok: true, text: 'Shown in full' });

      const replies = store.turns().filter((turn) => turn.role === 'assistant');
      expect(replies).toEqual([
        expect.objectContaining({ kind: 'reply', text: 'Shown word by word', animate: false }),
        expect.objectContaining({ kind: 'reply', text: 'Shown in full', animate: false }),
      ]);
    });

    it('keeps animating an open reply until its reveal finishes', async () => {
      const store = create();
      store.setOpen(true);
      store.send('Hi');
      await reply(store, { ok: true, text: 'Hello there' });

      const [, answer] = store.turns();
      expect(answer).toMatchObject({ kind: 'reply', animate: true });
      store.finishReveal(answer.id);
      expect(store.turns()[1]).toMatchObject({ kind: 'reply', animate: false });
    });

    it('stops every animation when the panel closes (RF-25)', async () => {
      const store = create();
      store.setOpen(true);
      store.send('Hi');
      await reply(store, { ok: true, text: 'Hello there' });

      store.setOpen(false);
      expect(store.turns()[1]).toMatchObject({ kind: 'reply', animate: false });
    });
  });

  describe('errors and retry', () => {
    it('adds an error turn with the agent text or the failure reason (RF-26 to RF-28)', async () => {
      const store = create();
      store.send('One');
      await reply(store, { ok: false, reason: 'api', text: 'Unavailable right now.' });
      const [user, error] = store.turns();

      expect(error).toEqual({
        id: expect.any(String),
        role: 'assistant',
        kind: 'error',
        reason: 'api',
        text: 'Unavailable right now.',
        retryOf: user.id,
      });

      store.reset();
      store.send('Two');
      await reply(store, { ok: false, reason: 'timeout' });
      expect(store.turns()[1]).not.toHaveProperty('text');
      expect(store.turns()[1]).toMatchObject({ kind: 'error', reason: 'timeout' });
    });

    it('retries the same message with the same chat id and no duplicate turn (RF-29)', async () => {
      const store = create();
      store.send('Hi');
      const chatId = store.chatId();
      await reply(store, { ok: false, reason: 'generic' });
      const [user, error] = store.turns();

      store.retry(error.id);

      expect(agent.calls.length).toBe(2);
      expect(agent.last()).toMatchObject({ chatId, message: 'Hi' });
      expect(store.turns()).toEqual([user]);
      expect(store.pending()).toBe(true);
      await reply(store, { ok: true, text: 'Hello!' });
      expect(store.turns().map((turn) => turn.role)).toEqual(['user', 'assistant']);
    });

    it('ignores a retry while a reply is pending or for an unknown turn', async () => {
      const store = create();
      store.send('Hi');
      await reply(store, { ok: false, reason: 'generic' });
      const error = store.turns()[1];

      store.retry('unknown');
      expect(agent.calls.length).toBe(1);

      store.retry(error.id);
      store.retry(error.id);
      expect(agent.calls.length).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears the conversation and its stored copy (RF-23)', async () => {
      const store = create();
      store.send('Hi');
      await reply(store, { ok: true, text: 'Hello!' });

      store.reset();

      expect(store.turns()).toEqual([]);
      expect(store.chatId()).toBeNull();
      expect(store.pending()).toBe(false);
      expect((storage as MemoryStorage).stored()).toBeNull();
    });

    it('drops a reply that arrives after a reset', async () => {
      const store = create();
      store.send('Hi');
      const late = agent.last();

      store.reset();
      late.answer({ ok: true, text: 'Too late' });
      await settle();

      expect(store.turns()).toEqual([]);
      expect(store.pending()).toBe(false);
    });

    it('starts a new chat id after a reset', async () => {
      const store = create();
      store.send('Hi');
      const first = store.chatId();
      await reply(store, { ok: true, text: 'Hello!' });

      store.reset();
      store.send('Again');
      expect(store.chatId()).toMatch(UUID);
      expect(store.chatId()).not.toBe(first);
    });
  });

  describe('persistence', () => {
    it('stores every change with replies marked as not animated (RF-21)', async () => {
      const store = create();
      store.setOpen(true);
      store.send('Hi');
      expect((storage as MemoryStorage).stored()?.turns.length).toBe(1);
      await reply(store, { ok: true, text: 'Hello!' });

      const stored = (storage as MemoryStorage).stored();
      expect(stored).toEqual({
        version: 1,
        chatId: store.chatId(),
        turns: [
          expect.objectContaining({ role: 'user', text: 'Hi' }),
          expect.objectContaining({ kind: 'reply', text: 'Hello!', animate: false }),
        ],
      });
      expect(store.turns()[1]).toMatchObject({ animate: true });
    });

    it('restores the conversation in a new page, showing replies in full (RF-21)', async () => {
      const first = create();
      first.setOpen(true);
      first.send('Hi');
      await reply(first, { ok: true, text: 'Hello!' });

      const restored = create();

      expect(restored.chatId()).toBe(first.chatId());
      expect(restored.turns()).toEqual([
        expect.objectContaining({ role: 'user', text: 'Hi' }),
        expect.objectContaining({ kind: 'reply', text: 'Hello!', animate: false }),
      ]);
      expect(restored.pending()).toBe(false);
    });

    it('restores a message left without a reply as interrupted, ready to retry (plan D9)', async () => {
      const first = create();
      first.send('Hi');
      const user = first.turns()[0];

      const restored = create();

      expect(restored.turns()).toEqual([
        user,
        {
          id: expect.any(String),
          role: 'assistant',
          kind: 'error',
          reason: 'interrupted',
          retryOf: user.id,
        },
      ]);
      restored.retry(restored.turns()[1].id);
      expect(agent.last()).toMatchObject({ chatId: first.chatId(), message: 'Hi' });
    });

    it.each([
      ['invalid JSON', '{not json'],
      ['an unknown version', JSON.stringify({ version: 2, chatId: 'x', turns: [] })],
      ['turns that are not a list', JSON.stringify({ version: 1, chatId: 'x', turns: {} })],
      [
        'a malformed turn',
        JSON.stringify({ version: 1, chatId: 'x', turns: [{ id: 'u1', role: 'robot' }] }),
      ],
      ['a chat id without turns', JSON.stringify({ version: 1, chatId: 'x', turns: [] })],
      [
        'turns without a chat id',
        JSON.stringify({
          version: 1,
          chatId: null,
          turns: [{ id: 'u1', role: 'user', text: 'Hi' }],
        }),
      ],
    ])('starts empty and discards %s', (_, raw) => {
      (storage as MemoryStorage).setItem(ASSISTANT_STORAGE_KEY, raw);

      const store = create();

      expect(store.turns()).toEqual([]);
      expect(store.chatId()).toBeNull();
      expect((storage as MemoryStorage).data.has(ASSISTANT_STORAGE_KEY)).toBe(false);
    });

    it.each([
      ['blocked storage', () => BLOCKED],
      ['no storage (server)', () => null],
    ])('keeps working in memory with %s (RF-24)', async (_, make) => {
      storage = make();
      const store = create();

      store.send('Hi');
      await reply(store, { ok: true, text: 'Hello!' });
      store.reset();
      store.send('Again');

      expect(store.turns()).toEqual([expect.objectContaining({ role: 'user', text: 'Again' })]);
    });
  });
});
