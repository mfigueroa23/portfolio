import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { checkMessage, MAX_MESSAGE_LENGTH } from '../../core/utils/chat-validation';

/** Message field of the assistant panel (Spec 001 RF-10 to RF-13). */
@Component({
  selector: 'app-assistant-composer',
  templateUrl: './assistant-composer.html',
})
export class AssistantComposer {
  private readonly m = inject(LanguageService).m;
  protected readonly t = computed(() => this.m().assistant);
  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');

  /** A reply is awaited, so nothing can be sent. */
  public readonly pending = input(false);
  /** The trimmed message to send. */
  public readonly submitted = output<string>();

  protected readonly max = MAX_MESSAGE_LENGTH;
  protected readonly draft = signal('');
  protected readonly check = computed(() => checkMessage(this.draft()));
  protected readonly canSend = computed(() => this.check().canSend && !this.pending());

  public focus(): void {
    this.field().nativeElement.focus();
  }

  // Enter sends; Shift+Enter, or Enter while an IME composes a word, adds a line break.
  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (key.shiftKey || key.isComposing) return;
    event.preventDefault();
    this.send();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  private send(): void {
    if (!this.canSend()) return;
    this.submitted.emit(this.check().text);
    this.draft.set('');
  }
}
