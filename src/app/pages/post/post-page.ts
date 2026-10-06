import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { LocalDate } from '../../components/local-date/local-date';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';
import { HttpStatusService } from '../../core/services/http-status.service';
import { SeoService } from '../../core/services/seo.service';
import { accentTitle, tagKey } from '../../core/utils/text';
import { NotFound } from '../not-found/not-found';
import { Unavailable } from '../unavailable/unavailable';

/** `/blog/<slug>`: a published post with its table of contents and references (RF-101–RF-106). */
@Component({
  imports: [LocalDate, MarkdownBody, NotFound, Unavailable],
  selector: 'app-post-page',
  templateUrl: './post-page.html',
})
export class PostPage {
  private readonly slug = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { requireSync: true },
  );
  protected readonly post = inject(ContentService).post(() => this.slug());

  protected readonly heading = computed(() => accentTitle(this.post.value()?.title ?? ''));
  /** Hidden with fewer than 2 entries (RF-105). */
  protected readonly toc = computed(() => {
    const entries = this.post.value()?.toc ?? [];
    return entries.length >= 2 ? entries : [];
  });
  protected readonly tagKey = tagKey;
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  /** The post's URL in the page language, for the table of contents links. */
  protected readonly path = computed(() => {
    const post = this.post.value();
    return post ? this.alternates(post.slug, post.slugEs)[this.language.lang()] : '';
  });

  constructor() {
    const seo = inject(SeoService);
    const status = inject(HttpStatusService);
    effect(() => {
      const post = this.post.value();
      if (!post) return;
      const alternates = this.alternates(post.slug, post.slugEs);
      const lang = this.language.lang();
      // A Spanish URL with the English slug moves permanently to the Spanish slug (RF-175).
      if (lang === 'es' && this.slug() !== (post.slugEs ?? post.slug)) {
        status.redirect(alternates.es);
      }
      seo.set({
        title: post.title,
        description: post.summary,
        path: alternates[lang],
        image: post.coverUrl,
        type: 'article',
        alternates,
      });
      seo.feedLink();
    });
  }

  // Each language has its own URL slug; the Spanish one falls back to the English slug.
  private alternates(slug: string, slugEs?: string | null) {
    return { en: `/blog/${slug}`, es: `/es/blog/${slugEs ?? slug}` };
  }
}
