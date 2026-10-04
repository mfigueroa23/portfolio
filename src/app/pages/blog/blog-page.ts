import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { LocalDate } from '../../components/local-date/local-date';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { tagKey } from '../../core/utils/text';
import { NotFound } from '../not-found/not-found';
import { Unavailable } from '../unavailable/unavailable';

const DESCRIPTION = 'Write-ups by Marco Figueroa on building, deploying and running software.';

/**
 * `/blog`, `/blog/page/<n>`, `/blog/tag/<tag>` and `/blog/tag/<tag>/page/<n>`: published posts,
 * newest first, 10 per page (RF-91–RF-100).
 */
@Component({
  imports: [LocalDate, NotFound, Unavailable],
  selector: 'app-blog-page',
  templateUrl: './blog-page.html',
})
export class BlogPage {
  private readonly params = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => ({ page: params.get('page'), tag: params.get('tag') })),
    ),
    { requireSync: true },
  );
  protected readonly tag = computed(() => this.params().tag);

  /** Page 1 has no `/page/1` URL, so only integers ≥ 2 are valid there (RF-99). */
  private readonly pageNumber = computed<number | null>(() => {
    const page = this.params().page;
    if (page === null) return 1;
    return /^[1-9]\d*$/.test(page) && Number(page) >= 2 ? Number(page) : null;
  });
  protected readonly invalidPage = computed(() => this.pageNumber() === null);

  protected readonly posts = inject(ContentService).postPage(
    () => this.pageNumber(),
    () => this.tag(),
  );

  /** Tags of the listed posts, for the filter bar. */
  protected readonly tags = computed(() => {
    const unique = new Map<string, string>();
    for (const post of this.posts.value()?.items ?? []) {
      for (const tag of post.tags) if (!unique.has(tagKey(tag))) unique.set(tagKey(tag), tag);
    }
    return Array.from(unique, ([key, name]) => ({ key, name }));
  });

  protected readonly tagKey = tagKey;

  private readonly basePath = computed(() => {
    const tag = this.tag();
    return tag ? `/blog/tag/${tag}` : '/blog';
  });

  protected pageHref(page: number): string {
    return page === 1 ? this.basePath() : `${this.basePath()}/page/${page}`;
  }

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const listing = this.posts.value();
      if (!listing) return;
      const name = listing.tag ?? this.tag();
      const title = name ? `Posts tagged ${name}` : 'Blog';
      seo.set({
        title: listing.page > 1 ? `${title} — Page ${listing.page}` : title,
        description: DESCRIPTION,
        // Each listing page is its own canonical URL (RF-118).
        path: this.pageHref(listing.page),
      });
      seo.feedLink();
    });
  }
}
