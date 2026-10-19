import { Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PostSummary } from '../../core/interfaces/content';
import { tagKey } from '../../core/utils/text';
import { LocalDate } from '../local-date/local-date';

/** A post with its cover on top, for the home's latest posts (Spec 007 RF-12 to RF-14, plan D7). */
@Component({
  imports: [LocalDate],
  selector: 'app-post-card',
  templateUrl: './post-card.html',
  host: { class: 'block' },
})
export class PostCard {
  public readonly post = input.required<PostSummary>();
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  /** The post URL in the page language, with the Spanish slug under `/es` (RF-169). */
  protected readonly href = computed(() => {
    const { slug, slugEs } = this.post();
    return this.language.href(`/blog/${this.language.lang() === 'es' ? (slugEs ?? slug) : slug}`);
  });

  // Tag keys are the same in both languages (RF-165).
  protected tagHref(tag: string): string {
    return this.language.href(`/blog/tag/${tagKey(tag)}`);
  }
}
