import {
  afterEveryRender,
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { AssistantConversationService } from '../../core/services/assistant-conversation.service';
import { renderChatMarkdown } from '../../core/utils/chat-markdown';
import { AssistantComposer } from '../assistant-composer/assistant-composer';
import { AssistantMessage } from '../assistant-message/assistant-message';

/** Distance from the end of the thread, in pixels, that still counts as "at the bottom". */
const BOTTOM_SLACK_PX = 24;

/**
 * Floating launcher and chat panel of the personal assistant (Spec 001 RF-01 to RF-09, RF-18,
 * RF-19, RF-23). The panel is a non-modal dialog (plan D6): from `md` up it floats over the
 * page, which stays usable; below `md` it fills the screen.
 */
@Component({
  imports: [AssistantComposer, AssistantMessage],
  selector: 'app-assistant',
  templateUrl: './assistant.html',
})
export class Assistant {
  protected readonly conversation = inject(AssistantConversationService);
  private readonly m = inject(LanguageService).m;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly launcher = viewChild.required<ElementRef<HTMLButtonElement>>('launcher');
  private readonly composer = viewChild(AssistantComposer);
  private readonly thread = viewChild<ElementRef<HTMLElement>>('thread');

  protected readonly t = computed(() => this.m().assistant);
  protected readonly empty = computed(
    () => !this.conversation.turns().length && !this.conversation.pending(),
  );
  /** Text of the last reply shown in full, read once by screen readers (RF-19). */
  protected readonly announcement = signal('');
  private atBottom = true;

  constructor() {
    // Keep the newest content in view unless the visitor scrolled up to read (RF-18).
    afterEveryRender(() => {
      const thread = this.thread()?.nativeElement;
      if (thread && this.atBottom) thread.scrollTop = thread.scrollHeight;
    });
  }

  protected toggle(): void {
    if (this.conversation.open()) this.close();
    else this.open();
  }

  protected open(): void {
    this.atBottom = true;
    this.conversation.setOpen(true);
    this.afterRender(() => this.composer()?.focus());
  }

  protected close(): void {
    this.conversation.setOpen(false);
    this.afterRender(() => this.launcher().nativeElement.focus());
  }

  protected send(text: string): void {
    this.atBottom = true;
    this.conversation.send(text);
  }

  protected newConversation(): void {
    this.conversation.reset();
    this.announcement.set('');
    this.composer()?.focus();
  }

  protected onScroll(): void {
    const thread = this.thread()?.nativeElement;
    if (!thread) return;
    this.atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight <= BOTTOM_SLACK_PX;
  }

  protected onRevealed(id: string): void {
    this.conversation.finishReveal(id);
    const turn = this.conversation.turns().find((item) => item.id === id);
    if (turn?.role === 'assistant' && turn.kind === 'reply') {
      this.announcement.set(this.plainText(turn.text));
    }
  }

  // The rendered Markdown as text, so screen readers do not read the markers.
  private plainText(markdown: string): string {
    const container = this.document.createElement('div');
    container.innerHTML = renderChatMarkdown(markdown);
    return container.textContent ?? '';
  }

  private afterRender(action: () => void): void {
    afterNextRender(action, { injector: this.injector });
  }
}
