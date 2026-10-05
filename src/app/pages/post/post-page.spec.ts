import { RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ApiError, ContentService } from '../../core/services/content.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { SeoService } from '../../core/services/seo.service';
import { PostDetail } from '../../core/interfaces/content';
import { PostPage } from './post-page';

describe('PostPage', () => {
  const full: PostDetail = {
    id: 1,
    slug: 'moving-content',
    title: 'Moving content to an API',
    summary: 'Why the site stopped shipping content in the bundle.',
    coverUrl: 'https://api.example.com/files/cover',
    tags: ['Angular', 'Next JS'],
    publishedAt: '2026-10-03T23:30:00.000Z',
    readingMinutes: 7,
    bodyHtml: '<h2 id="before">Where we started</h2><h3 id="service">The service</h3><p>Text.</p>',
    toc: [
      { level: 2, text: 'Where we started', id: 'before' },
      { level: 3, text: 'The service', id: 'service' },
    ],
    references: [{ title: 'Angular SSR guide', url: 'https://angular.dev/guide/ssr' }],
  };
  let seo: { set: ReturnType<typeof vi.fn>; feedLink: ReturnType<typeof vi.fn> };
  let post: ReturnType<typeof vi.fn>;
  let init: ResponseInit;

  const render = async (value: PostDetail | undefined, error: ApiError | null = null) => {
    seo = { set: vi.fn(), feedLink: vi.fn() };
    init = { status: 200 };
    post = vi.fn(() => ({ value: signal(value), error: signal(error), isLoading: signal(false) }));
    await TestBed.configureTestingModule({
      imports: [PostPage],
      providers: [
        { provide: ContentService, useValue: { post } },
        { provide: SeoService, useValue: seo },
        { provide: MermaidService, useValue: { renderIn: vi.fn() } },
        { provide: RESPONSE_INIT, useValue: init },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'moving-content' })) },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PostPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('loads the post of the URL slug', async () => {
    await render(full);
    expect((post.mock.calls[0][0] as () => string)()).toBe('moving-content');
  });

  it('shows tags, title, date, reading time, cover and rendered body', async () => {
    const element = await render(full);

    expect(element.querySelector('a[href="/blog/tag/next-js"]')?.textContent?.trim()).toBe(
      'Next JS',
    );
    expect(element.querySelector('h1')?.textContent).toContain('Moving content to an API');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(full.publishedAt);
    expect(element.textContent).toContain('7 min read');
    expect(element.querySelector(`img[src="${full.coverUrl}"]`)?.getAttribute('alt')).toBe(
      full.title,
    );
    expect(element.querySelector('app-markdown-body h2#before')).not.toBeNull();
  });

  it('builds the table of contents with links to the heading anchors', async () => {
    const element = await render(full);
    const toc = element.querySelector('aside[aria-label="Table of contents"]');
    const links = Array.from(toc?.querySelectorAll('a') ?? []);

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/blog/moving-content#before',
      '/blog/moving-content#service',
    ]);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Where we started', 'The service']);
    expect(links[1].classList).toContain('pl-4');
  });

  it('hides the table of contents with fewer than 2 entries', async () => {
    const element = await render({ ...full, toc: [full.toc[0]] });
    expect(element.querySelector('aside[aria-label="Table of contents"]')).toBeNull();
  });

  it('lists the references as links opening in a new tab', async () => {
    const element = await render(full);
    const reference = element.querySelector('a[href="https://angular.dev/guide/ssr"]');
    expect(reference?.textContent).toContain('Angular SSR guide');
    expect(reference?.getAttribute('target')).toBe('_blank');
    expect(reference?.getAttribute('rel')).toContain('noopener');
  });

  it('hides the cover and the references when the post has none', async () => {
    const element = await render({ ...full, coverUrl: null, references: [] });
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).not.toContain('References');
  });

  it("shares the post's title, summary and cover, and declares the feed", async () => {
    await render(full);
    expect(seo.set).toHaveBeenCalledWith({
      title: full.title,
      description: full.summary,
      path: '/blog/moving-content',
      image: full.coverUrl,
      type: 'article',
    });
    expect(seo.feedLink).toHaveBeenCalled();
  });

  it('answers 404 for a missing or draft post', async () => {
    const element = await render(undefined, 'notFound');
    expect(init.status).toBe(404);
    expect(element.textContent).toContain('Page not found');
  });

  it('answers 503 when the API is unreachable', async () => {
    const element = await render(undefined, 'unavailable');
    expect(init.status).toBe(503);
    expect(element.textContent).toContain('Temporarily unavailable');
  });
});
