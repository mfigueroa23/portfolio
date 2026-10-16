import {
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { ChatTurn, ErrorTurn, ReplyTurn, UserTurn } from '../../core/interfaces/assistant';
import { renderChatMarkdown } from '../../core/utils/chat-markdown';
import { MS_PER_WORD, revealTokens, wordsPerTick } from '../../core/utils/word-reveal';

// Blinking block after the last revealed word; it lives in the rendered HTML so it follows the
// text inside paragraphs, list items and code blocks.
const CARET =
  '<span class="assistant-caret ml-0.5 inline-block h-[1em] w-[0.45em] translate-y-[0.15em] rounded-[1px] bg-primary animate-pulse motion-reduce:animate-none" aria-hidden="true"></span>';
const LAST_CLOSING_TAGS = /((?:<\/(?:p|li|code|pre|ul|ol)>)+)$/;

/** One turn of the assistant conversation (Spec 001 RF-14 to RF-17, RF-26 to RF-29). */
@Component({
  selector: 'app-assistant-message',
  templateUrl: './assistant-message.html',
})
export class AssistantMessage {
  private readonly m = inject(LanguageService).m;
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly t = computed(() => this.m().assistant);

  public readonly turn = input.required<ChatTurn>();
  /** A reply is awaited, so Retry waits too. */
  public readonly pending = input(false);
  /** The id of an error turn whose message should be sent again. */
  public readonly retry = output<string>();
  /** The id of a reply that is now shown in full. */
  public readonly revealed = output<string>();

  protected readonly user = computed(() => {
    const turn = this.turn();
    return turn.role === 'user' ? (turn as UserTurn) : null;
  });
  protected readonly reply = computed(() => {
    const turn = this.turn();
    return turn.role === 'assistant' && turn.kind === 'reply' ? (turn as ReplyTurn) : null;
  });
  protected readonly error = computed(() => {
    const turn = this.turn();
    if (turn.role !== 'assistant' || turn.kind !== 'error') return null;
    const { id, reason, text } = turn as ErrorTurn;
    const t = this.t();
    return { id, label: t.errorLabels[reason], text: reason === 'api' ? text : t.errors[reason] };
  });

  // Words shown so far while revealing; `null` shows the whole reply.
  private readonly shown = signal<number | null>(null);
  private stopReveal = (): void => undefined;

  protected readonly revealing = computed(() => this.shown() !== null);
  protected readonly html = computed(() => {
    const reply = this.reply();
    if (!reply) return '';
    const shown = this.shown();
    if (shown === null) return renderChatMarkdown(reply.text);
    const html = renderChatMarkdown(revealTokens(reply.text).slice(0, shown).join(''));
    return LAST_CLOSING_TAGS.test(html)
      ? html.replace(LAST_CLOSING_TAGS, `${CARET}$1`)
      : `${html}${CARET}`;
  });

  constructor() {
    effect((onCleanup) => {
      const reply = this.reply();
      if (!reply?.animate) return this.shown.set(null);
      if (this.prefersReducedMotion()) return this.finish(reply.id);

      const total = revealTokens(reply.text).length;
      const step = wordsPerTick(total);
      this.shown.set(0);
      const timer = setInterval(() => {
        const next = (this.shown() ?? total) + step;
        if (next >= total) this.finish(reply.id);
        else this.shown.set(next);
      }, MS_PER_WORD);
      this.stopReveal = () => clearInterval(timer);
      onCleanup(() => clearInterval(timer));
    });
  }

  /** Shows the whole reply at once (RF-15). */
  protected skip(): void {
    const reply = this.reply();
    if (reply && this.revealing()) this.finish(reply.id);
  }

  private finish(id: string): void {
    this.stopReveal();
    this.shown.set(null);
    this.revealed.emit(id);
  }

  private prefersReducedMotion(): boolean {
    return this.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
