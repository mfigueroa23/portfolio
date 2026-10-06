import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { TestimonialField } from '../../core/interfaces/testimonial';
import { TestimonialService } from '../../core/services/testimonial.service';
import { GENERIC_SEND_ERROR } from '../../core/utils/api-error';
import { invalidTestimonialFields } from '../../core/utils/testimonial-validation';
import { Button } from '../button/button';

// Element ids of the fields; `text` keeps the testimonial field apart from the dialog itself.
const FIELD_IDS: Record<TestimonialField, string> = {
  name: 'testimonial-name',
  role: 'testimonial-role',
  email: 'testimonial-email',
  testimonial: 'testimonial-text',
};

/**
 * Native modal `<dialog>` (focus trap, Escape and inert page come from `showModal()`) with the
 * visitor testimonial form (Spec 004 RF-4 to RF-12, RF-22 to RF-28, RF-32).
 */
@Component({
  imports: [Button],
  selector: 'app-testimonial-dialog',
  templateUrl: './testimonial-dialog.html',
})
export class TestimonialDialog {
  private readonly service = inject(TestimonialService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger: HTMLElement | null = null;

  protected readonly ids = FIELD_IDS;
  public readonly name = signal('');
  public readonly role = signal('');
  public readonly email = signal('');
  public readonly testimonial = signal('');
  // Honeypot: real visitors never see this field, so any value marks the submission as a bot.
  public readonly website = signal('');
  public readonly invalid = signal<TestimonialField[]>([]);
  public readonly sending = signal(false);
  public readonly status = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  /** Opens the dialog with an empty form; focus returns to `trigger` when it closes. */
  public open(trigger: HTMLElement | null): void {
    this.trigger = trigger;
    this.reset();
    this.dialog().nativeElement.showModal();
    this.focusAfterRender(`#${FIELD_IDS.name}`);
  }

  public close(): void {
    this.dialog().nativeElement.close();
  }

  protected onClosed(): void {
    this.trigger?.focus();
  }

  // The content wrapper fills the dialog, so only a backdrop click targets the dialog itself.
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  protected isInvalid(field: TestimonialField): boolean {
    return this.invalid().includes(field);
  }

  public async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    const values = {
      name: this.name(),
      role: this.role(),
      email: this.email(),
      testimonial: this.testimonial(),
    };
    const invalid = invalidTestimonialFields(values);
    this.invalid.set(invalid);
    this.status.set(null);
    if (invalid.length > 0) {
      this.field(invalid[0])?.focus();
      return;
    }
    this.sending.set(true);
    try {
      const message = await this.service.submit({ ...values, website: this.website() });
      this.status.set({ type: 'success', message });
      // The focused submit button disappears with the form.
      this.focusAfterRender('[data-close]');
    } catch (error) {
      this.status.set({
        type: 'error',
        message: (error instanceof Error && error.message) || GENERIC_SEND_ERROR,
      });
    } finally {
      this.sending.set(false);
    }
  }

  private reset(): void {
    this.name.set('');
    this.role.set('');
    this.email.set('');
    this.testimonial.set('');
    this.website.set('');
    this.invalid.set([]);
    this.status.set(null);
  }

  private field(field: TestimonialField): HTMLElement | null {
    return this.dialog().nativeElement.querySelector<HTMLElement>(`#${FIELD_IDS[field]}`);
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(
      () => this.dialog().nativeElement.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this.injector },
    );
  }
}
