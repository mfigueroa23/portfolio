import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostSummary } from '../../core/interfaces/content';
import { ContentService } from '../../core/services/content.service';
import { Blog } from './blog';

describe('Blog', () => {
  const post = (id: number): PostSummary => ({
    id,
    slug: `post-${id}`,
    title: `Post ${id}`,
    summary: `Summary ${id}.`,
    coverUrl: null,
    tags: ['linux'],
    publishedAt: `2026-10-${10 + id}T12:00:00.000Z`,
    readingMinutes: 5,
  });
  let latestPosts: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: PostSummary[]): Promise<ComponentFixture<Blog>> => {
    latestPosts = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Blog],
      providers: [
        { provide: ContentService, useValue: { latestPosts } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Blog);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the section with its anchor and the blog heading (U-SB-1)', async () => {
    const fixture = await render([post(1)]);
    const section = (fixture.nativeElement as HTMLElement).querySelector('section#blog');
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain('Latest Writing');
    expect(section?.querySelector('h2')?.textContent).toContain('the stack.');
  });

  it('shows the first 2 posts, in the API order (U-SB-2)', async () => {
    const fixture = await render([post(3), post(2), post(1)]);
    const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3'), (h3) =>
      h3.textContent?.trim(),
    );
    expect(titles).toEqual(['Post 3', 'Post 2']);
  });

  it('links "Read all posts" to /blog (U-SB-3)', async () => {
    const fixture = await render([post(1)]);
    const more = (fixture.nativeElement as HTMLElement).querySelector('a[href="/blog"]');
    expect(more?.textContent).toContain('Read all posts');
  });

  it('shows the empty state and no link to /blog without posts (U-SB-4)', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('section#blog')).not.toBeNull();
    expect(element.textContent).toContain('Posts coming soon');
    expect(element.querySelector('a[href="/blog"]')).toBeNull();
  });

  it('asks the API once for the latest posts (U-SB-5)', async () => {
    await render([]);
    expect(latestPosts).toHaveBeenCalledTimes(1);
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish blog (U-SB-6)', async () => {
      const fixture = await render([post(1)]);
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('Lo último del blog');
      expect(element.textContent).toContain('el stack.');
      expect(element.querySelector('a[href="/es/blog"]')?.textContent).toContain(
        'Ver todos los artículos',
      );
    });

    it('shows the Spanish empty state (U-SB-6)', async () => {
      const fixture = await render([]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Artículos próximamente',
      );
    });
  });
});
