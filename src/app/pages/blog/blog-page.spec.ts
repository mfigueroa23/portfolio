import { RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Params } from '@angular/router';
import { of } from 'rxjs';
import { ApiError, ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { PostPage, PostSummary } from '../../core/interfaces/content';
import { BlogPage } from './blog-page';

describe('BlogPage', () => {
  const post = (id: number, overrides: Partial<PostSummary> = {}): PostSummary => ({
    id,
    slug: `post-${id}`,
    title: `Post ${id}`,
    summary: `Summary ${id}.`,
    coverUrl: null,
    tags: ['Angular', 'Next JS'],
    publishedAt: '2026-10-03T23:30:00.000Z',
    readingMinutes: 7,
    ...overrides,
  });
  const pageOf = (overrides: Partial<PostPage> = {}): PostPage => ({
    items: [post(1, { coverUrl: 'https://api.example.com/files/cover' }), post(2)],
    page: 1,
    totalPages: 1,
    total: 2,
    tag: null,
    ...overrides,
  });
  let seo: { set: ReturnType<typeof vi.fn>; feedLink: ReturnType<typeof vi.fn> };
  let postPage: ReturnType<typeof vi.fn>;
  let init: ResponseInit;

  const render = async (
    params: Params,
    value: PostPage | undefined,
    error: ApiError | null = null,
  ) => {
    seo = { set: vi.fn(), feedLink: vi.fn() };
    init = { status: 200 };
    postPage = vi.fn(() => ({
      value: signal(value),
      error: signal(error),
      isLoading: signal(false),
    }));
    await TestBed.configureTestingModule({
      imports: [BlogPage],
      providers: [
        { provide: ContentService, useValue: { postPage } },
        { provide: SeoService, useValue: seo },
        { provide: RESPONSE_INIT, useValue: init },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(params)) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BlogPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const requested = () => {
    const [page, tag] = postPage.mock.calls[0] as [() => number | null, () => string | null];
    return { page: page(), tag: tag() };
  };

  describe('listing', () => {
    it('asks for the first page without a tag on /blog', async () => {
      await render({}, pageOf());
      expect(requested()).toEqual({ page: 1, tag: null });
    });

    it('shows title, summary, tags, date and reading time of each post', async () => {
      const element = await render({}, pageOf());
      const cards = element.querySelectorAll('article');

      expect(cards.length).toBe(2);
      expect(cards[0].querySelector('a[href="/blog/post-1"]')?.textContent).toContain('Post 1');
      expect(cards[0].textContent).toContain('Summary 1.');
      expect(cards[0].textContent).toContain('Angular');
      expect(cards[0].querySelector('time')?.getAttribute('datetime')).toBe(
        '2026-10-03T23:30:00.000Z',
      );
      expect(cards[0].textContent).toContain('7 min read');
    });

    it('shows the cover only for posts that have one', async () => {
      const element = await render({}, pageOf());
      const [withCover, withoutCover] = Array.from(element.querySelectorAll('article'));
      expect(withCover.querySelector('img')?.getAttribute('src')).toBe(
        'https://api.example.com/files/cover',
      );
      expect(withoutCover.querySelector('img')).toBeNull();
    });

    it('links to newer and older pages when there are several', async () => {
      const element = await render({ page: '2' }, pageOf({ page: 2, totalPages: 3, total: 25 }));
      const pagination = element.querySelector('nav[aria-label="Pagination"]');

      expect(requested().page).toBe(2);
      expect(pagination?.querySelector('a[href="/blog"]')?.textContent).toContain('Newer');
      expect(pagination?.querySelector('a[href="/blog/page/3"]')?.textContent).toContain('Older');
      expect(pagination?.textContent).toContain('Page 2 of 3');
    });

    it('does not link past the first or the last page', async () => {
      const element = await render({}, pageOf({ page: 1, totalPages: 2, total: 12 }));
      const pagination = element.querySelector('nav[aria-label="Pagination"]')!;
      expect(pagination.querySelector('a[href="/blog/page/2"]')?.textContent).toContain('Older');
      expect(Array.from(pagination.querySelectorAll('a'), (a) => a.textContent)).not.toContain(
        'Newer',
      );
    });

    it('hides the pagination with a single page', async () => {
      const element = await render({}, pageOf());
      expect(element.querySelector('nav[aria-label="Pagination"]')).toBeNull();
    });

    it('shows an empty state when no post is published', async () => {
      const element = await render({}, pageOf({ items: [], totalPages: 0, total: 0 }));
      expect(element.querySelector('article')).toBeNull();
      expect(element.textContent).toContain('No posts yet');
    });

    it('links to the RSS feed and declares it for feed readers', async () => {
      const element = await render({}, pageOf());
      expect(element.querySelector('a[href="/blog/rss.xml"]')?.textContent).toContain('RSS');
      expect(seo.feedLink).toHaveBeenCalled();
    });

    it('uses /blog as the canonical URL of the first page', async () => {
      await render({}, pageOf());
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Blog', path: '/blog' }),
      );
    });

    it('answers 503 when the API is unreachable', async () => {
      const element = await render({}, undefined, 'unavailable');
      expect(init.status).toBe(503);
      expect(element.textContent).toContain('Temporarily unavailable');
    });
  });

  describe('tags and invalid pages', () => {
    it('links each tag to its listing, lowercased with hyphens', async () => {
      const element = await render({}, pageOf());
      const chip = element.querySelector('article a[href="/blog/tag/next-js"]');
      expect(chip?.textContent?.trim()).toBe('Next JS');
    });

    it('lists the posts of a tag with its display name', async () => {
      const element = await render(
        { tag: 'next-js' },
        pageOf({ tag: 'Next JS', totalPages: 2, total: 11 }),
      );
      expect(requested()).toEqual({ page: 1, tag: 'next-js' });
      expect(element.textContent).toContain('Next JS');
      expect(element.querySelector('a[href="/blog/tag/next-js/page/2"]')?.textContent).toContain(
        'Older',
      );
    });

    it('uses the tag listing URL of each page as its canonical URL', async () => {
      await render({ tag: 'next-js' }, pageOf({ tag: 'Next JS' }));
      expect(seo.set).toHaveBeenCalledWith(expect.objectContaining({ path: '/blog/tag/next-js' }));
      TestBed.resetTestingModule();
      await render(
        { tag: 'next-js', page: '2' },
        pageOf({ tag: 'Next JS', page: 2, totalPages: 2 }),
      );
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/blog/tag/next-js/page/2' }),
      );
    });

    it('uses the page URL as the canonical URL of later pages', async () => {
      await render({ page: '3' }, pageOf({ page: 3, totalPages: 3 }));
      expect(seo.set).toHaveBeenCalledWith(expect.objectContaining({ path: '/blog/page/3' }));
    });

    it.each(['1', '0', '-2', '2.5', 'abc', '02'])(
      'answers 404 without asking the API for page "%s"',
      async (page) => {
        const element = await render({ page }, undefined);
        expect(requested().page).toBeNull();
        expect(init.status).toBe(404);
        expect(element.textContent).toContain('Page not found');
      },
    );

    it('answers 404 for a page beyond the last one or a tag without posts', async () => {
      const element = await render({ tag: 'unknown' }, undefined, 'notFound');
      expect(init.status).toBe(404);
      expect(element.textContent).toContain('Page not found');
    });
  });
});
