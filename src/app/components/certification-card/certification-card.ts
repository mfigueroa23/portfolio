import { afterNextRender, Component, computed, inject, input, signal } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { Certification } from '../../core/interfaces/content';
import { formatCalendarDate, isExpired } from '../../core/utils/dates';

/**
 * A certification with its dates, credential and links; used on `/experience` and on the home
 * (Spec 007 RF-04 to RF-07, plan D3).
 */
@Component({
  selector: 'app-certification-card',
  templateUrl: './certification-card.html',
  host: { class: 'block' },
})
export class CertificationCard {
  public readonly certification = input.required<Certification>();
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  // The server only knows UTC; after rendering, the browser uses the visitor's zone and date,
  // so a prerendered home does not keep the build date (RF-82, Spec 007 RF-07).
  private readonly timeZone = signal<string | undefined>('UTC');

  protected readonly issued = computed(() =>
    formatCalendarDate(this.certification().issueDate, this.language.lang()),
  );
  protected readonly expires = computed(() => {
    const { expiryDate } = this.certification();
    return expiryDate ? formatCalendarDate(expiryDate, this.language.lang()) : null;
  });
  protected readonly expired = computed(() =>
    isExpired(this.certification().expiryDate, new Date(), this.timeZone()),
  );

  constructor() {
    afterNextRender(() => this.timeZone.set(undefined));
  }
}
