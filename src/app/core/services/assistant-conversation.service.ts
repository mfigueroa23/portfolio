import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import {
  AgentResult,
  ChatTurn,
  ErrorTurn,
  ReplyTurn,
  StoredConversation,
  UserTurn,
} from '../interfaces/assistant';
import { checkMessage } from '../utils/chat-validation';
import { AssistantService } from './assistant.service';

/** The part of `Storage` the conversation uses. */
export type AssistantStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Key of the conversation in `sessionStorage`; the suffix follows `StoredConversation.version`. */
export const ASSISTANT_STORAGE_KEY = 'assistant.conversation.v1';

/**
 * Where the conversation lives for the tab (Spec 001 RF-21, RF-22, plan D3): `sessionStorage`
 * in the browser, `null` on the server or when the browser refuses access, which keeps the
 * conversation in memory only (RF-24).
 */
export const ASSISTANT_STORAGE = new InjectionToken<AssistantStorage | null>('ASSISTANT_STORAGE', {
  providedIn: 'root',
  factory: () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return null;
    try {
      return inject(DOCUMENT).defaultView?.sessionStorage ?? null;
    } catch {
      return null;
    }
  },
});

const ERROR_REASONS: ReadonlySet<unknown> = new Set(['api', 'generic', 'timeout', 'interrupted']);

const newId = (): string => crypto.randomUUID();

const isReply = (turn: ChatTurn): turn is ReplyTurn =>
  turn.role === 'assistant' && turn.kind === 'reply';

const isError = (turn: ChatTurn): turn is ErrorTurn =>
  turn.role === 'assistant' && turn.kind === 'error';

const stopAnimation = (turn: ChatTurn): ChatTurn =>
  isReply(turn) && turn.animate ? { ...turn, animate: false } : turn;

/** Any stored turn's fields, unchecked. */
type RawTurn = Partial<Record<'id' | 'role' | 'kind' | 'text' | 'reason' | 'retryOf', unknown>>;

function isTurn(value: unknown): value is ChatTurn {
  const turn = value as RawTurn | null;
  if (typeof turn?.id !== 'string') return false;
  if (turn.role === 'user') return typeof turn.text === 'string';
  if (turn.role !== 'assistant') return false;
  if (turn.kind === 'reply') return typeof turn.text === 'string';
  return (
    turn.kind === 'error' &&
    ERROR_REASONS.has(turn.reason) &&
    typeof turn.retryOf === 'string' &&
    (turn.text === undefined || typeof turn.text === 'string')
  );
}

/** A stored conversation, or `null` when the value is missing, corrupt or of another version. */
function parse(raw: string): StoredConversation | null {
  try {
    const value = JSON.parse(raw) as Partial<StoredConversation> | null;
    const turns = value?.turns;
    if (value?.version !== 1 || !Array.isArray(turns) || !turns.every(isTurn)) return null;
    // `chatId` is `null` exactly when there are no turns.
    const consistent =
      value.chatId === null
        ? turns.length === 0
        : typeof value.chatId === 'string' && !!turns.length;
    return consistent ? (value as StoredConversation) : null;
  } catch {
    return null;
  }
}

/**
 * The assistant conversation of the tab (plan M5): the single source of truth for the chat
 * panel. It sends one message at a time through `AssistantService`, keeps the turns, and
 * stores them for the tab so they survive navigations and reloads, which are full page loads.
 */
@Injectable({ providedIn: 'root' })
export class AssistantConversationService {
  private readonly agent = inject(AssistantService);
  private readonly storage = inject(ASSISTANT_STORAGE);

  private readonly turnsState = signal<ChatTurn[]>([]);
  private readonly chatIdState = signal<string | null>(null);
  private readonly pendingState = signal(false);
  private readonly openState = signal(false);
  // Bumped by every request and by reset, so a reply that is no longer awaited is dropped.
  private generation = 0;

  public readonly turns = this.turnsState.asReadonly();
  public readonly chatId = this.chatIdState.asReadonly();
  /** A reply is awaited; nothing else can be sent meanwhile (RF-13). */
  public readonly pending = this.pendingState.asReadonly();
  /** The panel is open; only replies received while it is open are revealed word by word. */
  public readonly open = this.openState.asReadonly();

  constructor() {
    this.restore();
  }

  public setOpen(open: boolean): void {
    this.openState.set(open);
    // A reply being revealed is shown in full when the panel opens again (RF-25).
    if (!open) this.turnsState.update((turns) => turns.map(stopAnimation));
  }

  /** Sends `text` if it is valid and nothing is pending; returns whether it was sent. */
  public send(text: string): boolean {
    const message = checkMessage(text);
    if (!message.canSend || this.pendingState()) return false;
    // A conversation gets its id with its first message (RF-20).
    const chatId = this.chatIdState() ?? newId();
    this.chatIdState.set(chatId);
    const user: UserTurn = { id: newId(), role: 'user', text: message.text };
    this.save([...this.turnsState(), user]);
    void this.ask(chatId, user);
    return true;
  }

  /** Sends again the message of the error turn `errorId`, replacing that turn (RF-29). */
  public retry(errorId: string): void {
    const chatId = this.chatIdState();
    if (this.pendingState() || !chatId) return;
    const turns = this.turnsState();
    const error = turns.find((turn): turn is ErrorTurn => isError(turn) && turn.id === errorId);
    const user = turns.find(
      (turn): turn is UserTurn => turn.role === 'user' && turn.id === error?.retryOf,
    );
    if (!error || !user) return;
    this.save(turns.filter((turn) => turn !== error));
    void this.ask(chatId, user);
  }

  /** Starts over: a new conversation without turns, a pending reply dropped (RF-23). */
  public reset(): void {
    this.generation++;
    this.pendingState.set(false);
    this.chatIdState.set(null);
    this.turnsState.set([]);
    this.write(null);
  }

  /** Marks the reply `id` as fully revealed. */
  public finishReveal(id: string): void {
    this.turnsState.update((turns) =>
      turns.map((turn) => (turn.id === id ? stopAnimation(turn) : turn)),
    );
  }

  private async ask(chatId: string, user: UserTurn): Promise<void> {
    const generation = ++this.generation;
    this.pendingState.set(true);
    const result = await this.agent.send(chatId, user.text);
    if (generation !== this.generation) return;
    this.pendingState.set(false);
    this.save([...this.turnsState(), this.turnFor(result, user)]);
  }

  private turnFor(result: AgentResult, user: UserTurn): ChatTurn {
    const id = newId();
    if (result.ok) {
      return { id, role: 'assistant', kind: 'reply', text: result.text, animate: this.openState() };
    }
    const error: ErrorTurn = {
      id,
      role: 'assistant',
      kind: 'error',
      reason: result.reason,
      retryOf: user.id,
    };
    return result.reason === 'api' ? { ...error, text: result.text } : error;
  }

  /** Sets the turns and stores them; stored replies are never animated again. */
  private save(turns: ChatTurn[]): void {
    this.turnsState.set(turns);
    this.write({ version: 1, chatId: this.chatIdState(), turns: turns.map(stopAnimation) });
  }

  private write(conversation: StoredConversation | null): void {
    try {
      if (conversation) this.storage?.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(conversation));
      else this.storage?.removeItem(ASSISTANT_STORAGE_KEY);
    } catch {
      // Storage refused (blocked or full): the conversation goes on in memory (RF-24).
    }
  }

  private restore(): void {
    let raw: string | null;
    try {
      raw = this.storage?.getItem(ASSISTANT_STORAGE_KEY) ?? null;
    } catch {
      return;
    }
    if (raw === null) return;
    const stored = parse(raw);
    if (!stored) return this.write(null);

    this.chatIdState.set(stored.chatId);
    const turns = stored.turns.map(stopAnimation);
    const last = turns.at(-1);
    if (last?.role !== 'user') return this.turnsState.set(turns);
    // The page changed before the reply arrived: offer to send it again (plan D9).
    const interrupted: ErrorTurn = {
      id: newId(),
      role: 'assistant',
      kind: 'error',
      reason: 'interrupted',
      retryOf: last.id,
    };
    this.save([...turns, interrupted]);
  }
}
