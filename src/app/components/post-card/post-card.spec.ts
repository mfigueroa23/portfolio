import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PostSummary } from '../../core/interfaces/content';
import { PostCard } from './post-card';

describe('PostCard', () => {
  const post = (overrides: Partial<PostSummary> = {}): PostSummary => ({
    id: 5,
    slug: 'raspberry-pi-5-eth0',
    slugEs: 'raspberry-pi-5-eth0-es',
    title: 'When eth0 stops transmitting',
    summary: 'A watchdog and a kernel downgrade.',
    coverUrl: 'https://api.example.com/files/cover',
    tags: ['kernel', 'raspberry pi'],
    publishedAt: '2026-10-18T12:00:00.000Z',
    readingMinutes: 7,
    ...overrides,
  });
  let pathname = '/';

  const render = async (value: PostSummary): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [{ provide: PlatformLocation, useValue: { pathname } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PostCard);
    fixture.componentRef.setInput('post', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the cover with the title as its alternative text (U-PC-1)', async () => {
    const img = (await render(post())).querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://api.example.com/files/cover');
    expect(img?.getAttribute('alt')).toBe('When eth0 stops transmitting');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('shows no image when the post has no cover (U-PC-1)', async () => {
    expect((await render(post({ coverUrl: null }))).querySelector('img')).toBeNull();
  });

  it('shows the date, reading time, title, summary and every tag (U-PC-2)', async () => {
    const element = await render(post());
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-18T12:00:00.000Z',
    );
    expect(element.textContent).toContain('7 min read');
    expect(element.querySelector('h3')?.textContent?.trim()).toBe('When eth0 stops transmitting');
    expect(element.textContent).toContain('A watchdog and a kernel downgrade.');
    expect(element.textContent).toContain('kernel');
    expect(element.textContent).toContain('raspberry pi');
  });

  it('links the title to the post and each tag to its tag page (U-PC-3)', async () => {
    const element = await render(post());
    expect(element.querySelector('h3 a')?.getAttribute('href')).toBe('/blog/raspberry-pi-5-eth0');
    expect(element.querySelector('a[href="/blog/tag/kernel"]')?.textContent?.trim()).toBe('kernel');
    expect(element.querySelector('a[href="/blog/tag/raspberry-pi"]')?.textContent?.trim()).toBe(
      'raspberry pi',
    );
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('links to the Spanish slug, or to the slug when there is none (U-PC-4)', async () => {
      const element = await render(post());
      expect(element.querySelector('h3 a')?.getAttribute('href')).toBe(
        '/es/blog/raspberry-pi-5-eth0-es',
      );
      expect(element.querySelector('a[href="/es/blog/tag/kernel"]')).not.toBeNull();
      expect(element.textContent).toContain('7 min de lectura');

      TestBed.resetTestingModule();
      const fallback = await render(post({ slugEs: null }));
      expect(fallback.querySelector('h3 a')?.getAttribute('href')).toBe(
        '/es/blog/raspberry-pi-5-eth0',
      );
    });

    it('marks a post shown in English (U-PC-5)', async () => {
      const english = await render(post({ lang: 'en' }));
      expect(english.querySelector('article')?.getAttribute('lang')).toBe('en');

      TestBed.resetTestingModule();
      const spanish = await render(post({ lang: 'es' }));
      expect(spanish.querySelector('article')?.hasAttribute('lang')).toBe(false);
    });
  });
});
