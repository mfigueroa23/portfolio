import { afterNextRender, Component, computed, input, signal } from '@angular/core';
import { formatInstant } from '../../core/utils/dates';

/**
 * A publication date. The server (and the first browser render, so hydration matches) shows
 * the UTC date; after rendering, the browser shows it in the visitor's time zone (RF-111).
 */
@Component({
  selector: 'app-local-date',
  template: '<time [attr.datetime]="iso()">{{ text() }}</time>',
})
export class LocalDate {
  public readonly iso = input.required<string>();
  // `undefined` is the runtime's (browser's) time zone.
  private readonly timeZone = signal<string | undefined>('UTC');
  protected readonly text = computed(() => formatInstant(this.iso(), this.timeZone()));

  constructor() {
    afterNextRender(() => this.timeZone.set(undefined));
  }
}
