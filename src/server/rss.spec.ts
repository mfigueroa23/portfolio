import { PostSummary } from '../app/core/interfaces/content';
import { buildRssFeed } from './rss';

describe('buildRssFeed', () => {
  const site = 'https://marco.figueroa-sanchez.com';
  const post: PostSummary = {
    id: 1,
    slug: 'moving-content',
    title: 'Moving content <fast> & "safe"',
    summary: "From JSON files to an API's endpoints.",
    coverUrl: null,
    tags: ['Angular', 'Next JS'],
    publishedAt: '2026-10-03T23:30:00.000Z',
    readingMinutes: 7,
  };

  const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

  it('builds a valid RSS 2.0 document', () => {
    const doc = parse(buildRssFeed([post], site));
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.nodeName).toBe('rss');
    expect(doc.documentElement.getAttribute('version')).toBe('2.0');
    expect(doc.querySelector('channel > title')?.textContent).toBe('Marco Figueroa — Blog');
    expect(doc.querySelector('channel > link')?.textContent).toBe(`${site}/blog`);
  });

  it('describes each post with an absolute link, summary, date and tags', () => {
    const item = parse(buildRssFeed([post], site)).querySelector('item')!;
    expect(item.querySelector('title')?.textContent).toBe(post.title);
    expect(item.querySelector('link')?.textContent).toBe(`${site}/blog/moving-content`);
    expect(item.querySelector('guid')?.textContent).toBe(`${site}/blog/moving-content`);
    expect(item.querySelector('description')?.textContent).toBe(post.summary);
    expect(item.querySelector('pubDate')?.textContent).toBe('Sat, 03 Oct 2026 23:30:00 +0000');
    expect(Array.from(item.querySelectorAll('category'), (c) => c.textContent)).toEqual([
      'Angular',
      'Next JS',
    ]);
  });

  it('escapes XML special characters', () => {
    const xml = buildRssFeed([post], site);
    expect(xml).toContain('Moving content &lt;fast&gt; &amp; &quot;safe&quot;');
    expect(xml).not.toContain('<fast>');
  });

  it('keeps the order of the posts', () => {
    const second = { ...post, id: 2, slug: 'second' };
    const links = Array.from(
      parse(buildRssFeed([post, second], site)).querySelectorAll('item > link'),
      (link) => link.textContent,
    );
    expect(links).toEqual([`${site}/blog/moving-content`, `${site}/blog/second`]);
  });

  it('is a valid feed with no items when nothing is published', () => {
    const doc = parse(buildRssFeed([], site));
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('channel')).not.toBeNull();
    expect(doc.querySelectorAll('item').length).toBe(0);
  });

  describe('Spanish feed (RF-143, RF-144)', () => {
    const translated: PostSummary = { ...post, slugEs: 'mover-contenido', lang: 'es' };

    it('has a Spanish channel at /es/blog', () => {
      const doc = parse(buildRssFeed([post], site, 'es'));
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelector('channel > title')?.textContent).toBe(
        'Marco Figueroa — Blog en español',
      );
      expect(doc.querySelector('channel > description')?.textContent).toBe(
        'Artículos sobre cómo construir, desplegar y operar software.',
      );
      expect(doc.querySelector('channel > language')?.textContent).toBe('es');
      expect(doc.querySelector('channel > link')?.textContent).toBe(`${site}/es/blog`);
      expect(doc.documentElement.innerHTML).toContain(`${site}/es/blog/rss.xml`);
    });

    it('links each post to its Spanish URL, with the English slug as fallback', () => {
      const links = Array.from(
        parse(
          buildRssFeed([translated, { ...post, id: 2, slug: 'second' }], site, 'es'),
        ).querySelectorAll('item > link'),
        (link) => link.textContent,
      );
      expect(links).toEqual([`${site}/es/blog/mover-contenido`, `${site}/es/blog/second`]);
    });

    it('keeps the English feed unchanged (RF-145)', () => {
      expect(buildRssFeed([translated], site)).toBe(buildRssFeed([translated], site, 'en'));
      const doc = parse(buildRssFeed([translated], site));
      expect(doc.querySelector('channel > language')?.textContent).toBe('en');
      expect(doc.querySelector('item > link')?.textContent).toBe(`${site}/blog/moving-content`);
    });
  });
});
