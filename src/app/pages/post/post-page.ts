import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { LocalDate } from '../../components/local-date/local-date';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { ContentService } from '../../core/services/content.service';
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

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const post = this.post.value();
      if (!post) return;
      seo.set({
        title: post.title,
        description: post.summary,
        path: `/blog/${post.slug}`,
        image: post.coverUrl,
        type: 'article',
      });
      seo.feedLink();
    });
  }
}
