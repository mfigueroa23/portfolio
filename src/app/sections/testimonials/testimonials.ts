import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { TestimonialDialog } from '../../components/testimonial-dialog/testimonial-dialog';
import { LanguageService } from '../../core/i18n/language.service';
import { Testimonial } from '../../core/interfaces/content';
import { ContentService } from '../../core/services/content.service';
import { initials } from '../../core/utils/initials';

@Component({
  imports: [TestimonialDialog],
  selector: 'app-testimonials',
  styleUrl: './testimonials.css',
  templateUrl: './testimonials.html',
})
export class Testimonials {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  public readonly testimonials = inject(ContentService).collection<Testimonial>('testimonials');
  public readonly activeIndex = signal(0);
  public readonly active = computed(() => this.testimonials()[this.activeIndex()]);
  // The form needs a running app, so the prerendered page never shows its button (RF-3).
  public readonly hydrated = signal(false);
  protected readonly initials = initials;

  public constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }

  public next = (): void => {
    this.activeIndex.update((index) => (index + 1) % this.testimonials().length);
  };
  public previous = (): void => {
    this.activeIndex.update(
      (index) => (index - 1 + this.testimonials().length) % this.testimonials().length,
    );
  };
}
