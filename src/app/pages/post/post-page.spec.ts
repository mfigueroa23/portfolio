import { PlatformLocation } from '@angular/common';
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
  let pathname = '/';

  let routeSlug = 'moving-content';
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
        { provide: PlatformLocation, useValue: { pathname } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: routeSlug })) },
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
      alternates: { en: '/blog/moving-content', es: '/es/blog/moving-content' },
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

  describe('in Spanish', () => {
    const spanish: PostDetail = {
      ...full,
      slugEs: 'mover-contenido',
      title: 'Mover el contenido a una API',
      lang: 'es',
    };
    beforeEach(() => (pathname = '/es/blog/mover-contenido'));
    afterEach(() => {
      pathname = '/';
      routeSlug = 'moving-content';
    });

    it('translates its texts, dates and reading time (RF-131, RF-134, RF-135)', async () => {
      routeSlug = 'mover-contenido';
      const element = await render(spanish);

      expect(element.querySelector('a[href="/es/blog"]')?.textContent).toContain(
        'Todos los artículos',
      );
      expect(element.textContent).toContain('7 min de lectura');
      expect(element.querySelector('time')?.textContent).toMatch(/\d+ oct 2026/);
      expect(element.textContent).toContain('Referencias');
      expect(element.textContent).toContain('En esta página');
      expect(element.querySelector('a[href="/es/blog/tag/next-js"]')).not.toBeNull();
      expect(element.querySelector('a[href="/es/blog/mover-contenido#before"]')).not.toBeNull();
    });

    it("declares each language's URL with its own slug (RF-137, RF-138, RF-176)", async () => {
      routeSlug = 'mover-contenido';
      await render(spanish);
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/es/blog/mover-contenido',
          alternates: { en: '/blog/moving-content', es: '/es/blog/mover-contenido' },
        }),
      );
      expect(init.status).toBe(200);
    });

    it('redirects permanently from the English slug to the Spanish one (RF-175)', async () => {
      pathname = '/es/blog/moving-content';
      await render(spanish);
      expect(init.status).toBe(301);
      expect(new Headers(init.headers).get('Location')).toBe('/es/blog/mover-contenido');
    });

    it('marks a post shown in English (RF-152)', async () => {
      pathname = '/es/blog/moving-content';
      const element = await render({ ...full, slugEs: null, lang: 'en' });
      expect(init.status).toBe(200);
      expect(element.querySelector('section')?.getAttribute('lang')).toBe('en');
    });
  });
});
