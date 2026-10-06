import { afterNextRender, Component, computed, inject, input, signal } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { formatInstant } from '../../core/utils/dates';

/**
 * A publication date. The server (and the first browser render, so hydration matches) shows
 * the UTC date; after rendering, the browser shows it in the visitor's time zone (RF-111), in
 * the page language (Spec 004 RF-134).
 */
@Component({
  selector: 'app-local-date',
  template: '<time [attr.datetime]="iso()">{{ text() }}</time>',
})
export class LocalDate {
  public readonly iso = input.required<string>();
  // `undefined` is the runtime's (browser's) time zone.
  private readonly timeZone = signal<string | undefined>('UTC');
  private readonly lang = inject(LanguageService).lang;
  protected readonly text = computed(() => formatInstant(this.iso(), this.timeZone(), this.lang()));

  constructor() {
    afterNextRender(() => this.timeZone.set(undefined));
  }
}
