import { Component, inject, signal } from '@angular/core';
import { Button } from '../../components/button/button';
import { LanguageService } from '../../core/i18n/language.service';
import { ContactInfo } from '../../core/interfaces/content';
import { ContactService } from '../../core/services/contact.service';
import { ContentService } from '../../core/services/content.service';

@Component({
  imports: [Button],
  selector: 'app-contact',
  styleUrl: './contact.css',
  templateUrl: './contact.html',
})
export class Contact {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  private readonly contactService = inject(ContactService);
  public readonly contactInfo = inject(ContentService).collection<ContactInfo>('contact-info');
  public readonly name = signal('');
  public readonly email = signal('');
  public readonly message = signal('');
  // Honeypot: real visitors never see this field, so any value marks the submission as a bot.
  public readonly website = signal('');
  public readonly isLoading = signal(false);
  public readonly status = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  public async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.isLoading.set(true);
    this.status.set(null);
    try {
      const result = await this.contactService.send({
        name: this.name(),
        email: this.email(),
        message: this.message(),
        website: this.website(),
      });
      this.status.set({ type: 'success', message: result });
      this.name.set('');
      this.email.set('');
      this.message.set('');
    } catch (error) {
      this.status.set({
        type: 'error',
        message: (error instanceof Error && error.message) || this.m().forms.sendError,
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
