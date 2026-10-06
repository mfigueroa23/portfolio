import { PlatformLocation } from '@angular/common';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../i18n/language.service';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  const site = 'https://marco.figueroa-sanchez.com';
  let service: SeoService;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], link[rel="alternate"]')
      .forEach((el) => el.remove());
  });

  const meta = (attr: 'name' | 'property', key: string) =>
    document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content');
  const canonical = () => document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');

  it('sets the title, description, canonical URL and sharing tags', () => {
    service.set({ title: 'Projects', description: 'Every project.', path: '/projects' });

    expect(document.title).toBe('Projects — Marco Figueroa');
    expect(meta('name', 'description')).toBe('Every project.');
    expect(canonical().length).toBe(1);
    expect(canonical()[0].getAttribute('href')).toBe(`${site}/projects`);
    expect(meta('property', 'og:title')).toBe('Projects — Marco Figueroa');
    expect(meta('property', 'og:description')).toBe('Every project.');
    expect(meta('property', 'og:url')).toBe(`${site}/projects`);
    expect(meta('property', 'og:type')).toBe('website');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'twitter:title')).toBe('Projects — Marco Figueroa');
    expect(meta('name', 'twitter:description')).toBe('Every project.');
    expect(meta('name', 'twitter:url')).toBe(`${site}/projects`);
  });

  it('falls back to the default image', () => {
    service.set({ title: 'Blog', description: 'Posts.', path: '/blog' });

    expect(meta('property', 'og:image')).toBe(`${site}/og-image.webp`);
    expect(meta('name', 'twitter:image')).toBe(`${site}/og-image.webp`);
  });

  it("uses the item's image and type when given", () => {
    const image = 'https://api.figueroa-sanchez.com/files/abc';
    service.set({
      title: 'A post',
      description: 'S.',
      path: '/blog/a-post',
      image,
      type: 'article',
    });

    expect(meta('property', 'og:image')).toBe(image);
    expect(meta('name', 'twitter:image')).toBe(image);
    expect(meta('property', 'og:image:alt')).toBe('A post');
    expect(meta('property', 'og:type')).toBe('article');
    // Dimensions of the default image do not describe another image.
    expect(meta('property', 'og:image:width')).toBeUndefined();
  });

  it('replaces the canonical URL instead of adding another one', () => {
    service.set({ title: 'Blog', description: 'Posts.', path: '/blog' });
    service.set({ title: 'Blog', description: 'Posts.', path: '/blog/page/2' });

    expect(canonical().length).toBe(1);
    expect(canonical()[0].getAttribute('href')).toBe(`${site}/blog/page/2`);
  });

  it('declares the RSS feed once, and drops it on pages that are not the blog', () => {
    const feed = () =>
      document.head.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]');
    service.set({ title: 'Blog', description: 'Posts.', path: '/blog' });
    service.feedLink();
    service.feedLink();

    expect(feed().length).toBe(1);
    expect(feed()[0].getAttribute('type')).toBe('application/rss+xml');
    expect(feed()[0].getAttribute('href')).toBe(`${site}/blog/rss.xml`);

    service.set({ title: 'Projects', description: 'Every project.', path: '/projects' });
    expect(feed().length).toBe(0);
  });

  describe('language versions', () => {
    const hreflang = (lang: string) =>
      document.head
        .querySelector(`link[rel="alternate"][hreflang="${lang}"]`)
        ?.getAttribute('href');

    const onPage = (pathname: string): void => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PlatformLocation, useValue: { pathname } }],
      });
      service = TestBed.inject(SeoService);
      document = TestBed.inject(DOCUMENT);
    };

    it('declares both versions and English as the default (RF-137 to RF-139)', () => {
      service.set({ title: 'Blog', description: 'Posts.', path: '/blog' });

      expect(hreflang('en')).toBe(`${site}/blog`);
      expect(hreflang('es')).toBe(`${site}/es/blog`);
      expect(hreflang('x-default')).toBe(`${site}/blog`);
      expect(meta('property', 'og:locale')).toBe('en_US');
      expect(meta('property', 'og:locale:alternate')).toBe('es_ES');
    });

    it('gives a Spanish page its own canonical URL and locale (RF-140, RF-141)', () => {
      onPage('/es/blog');
      service.set({ title: 'Blog', description: 'Artículos.', path: '/blog' });

      expect(canonical()[0].getAttribute('href')).toBe(`${site}/es/blog`);
      expect(meta('property', 'og:url')).toBe(`${site}/es/blog`);
      expect(meta('property', 'og:locale')).toBe('es_ES');
      expect(meta('property', 'og:locale:alternate')).toBe('en_US');
      expect(hreflang('es')).toBe(`${site}/es/blog`);
      expect(hreflang('x-default')).toBe(`${site}/blog`);
    });

    it('uses the given alternates and shares them with the language switch', () => {
      onPage('/es/blog/hola');
      service.set({
        title: 'Hola',
        description: 'Un post.',
        path: '/es/blog/hola',
        alternates: { en: '/blog/hello', es: '/es/blog/hola' },
      });

      expect(canonical()[0].getAttribute('href')).toBe(`${site}/es/blog/hola`);
      expect(hreflang('en')).toBe(`${site}/blog/hello`);
      expect(TestBed.inject(LanguageService).alternates()).toEqual({
        en: '/blog/hello',
        es: '/es/blog/hola',
      });
    });

    it('replaces the language links instead of adding more', () => {
      service.set({ title: 'Blog', description: 'Posts.', path: '/blog' });
      service.set({ title: 'Blog', description: 'Posts.', path: '/blog/page/2' });

      expect(document.head.querySelectorAll('link[hreflang]').length).toBe(3);
      expect(hreflang('es')).toBe(`${site}/es/blog/page/2`);
    });

    it('describes the default image in the page language', () => {
      onPage('/es');
      service.set({ title: 'Inicio', description: 'Hola.', path: '/' });
      expect(meta('property', 'og:image:alt')).toBe('Marco Figueroa — Desarrollador full-stack');
    });

    it('keeps the site title as is on the home', () => {
      service.set({
        title: 'Marco Figueroa — Full-Stack Developer',
        description: 'Hi.',
        path: '/',
        fullTitle: true,
      });
      expect(document.title).toBe('Marco Figueroa — Full-Stack Developer');
      expect(meta('property', 'og:url')).toBe(`${site}/`);
    });

    it('declares the Spanish feed on Spanish pages', () => {
      onPage('/es/blog');
      service.set({ title: 'Blog', description: 'Artículos.', path: '/blog' });
      service.feedLink();
      const feed = document.head.querySelector('link[type="application/rss+xml"]');

      expect(feed?.getAttribute('href')).toBe(`${site}/es/blog/rss.xml`);
      expect(feed?.getAttribute('title')).toBe('Marco Figueroa — Blog en español');
    });
  });
});
