import { PlatformLocation } from '@angular/common';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService, langCookie } from './language.service';

describe('LanguageService', () => {
  const create = (pathname: string): LanguageService => {
    TestBed.configureTestingModule({
      providers: [{ provide: PlatformLocation, useValue: { pathname } }],
    });
    return TestBed.inject(LanguageService);
  };

  it('is English at unprefixed URLs', () => {
    const service = create('/blog');
    expect(service.lang()).toBe('en');
    expect(service.m().nav.blog).toBe('Blog');
  });

  it('is Spanish under /es (RF-131)', () => {
    const service = create('/es/blog');
    expect(service.lang()).toBe('es');
    expect(service.m().nav.about).toBe('Sobre mí');
  });

  it('declares the page language on the html element (RF-136)', () => {
    create('/es');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('es');
  });

  it('defaults the alternates to the same path in each language', () => {
    expect(create('/es/blog/tag/angular').alternates()).toEqual({
      en: '/blog/tag/angular',
      es: '/es/blog/tag/angular',
    });
  });

  it('lets a page override the alternates', () => {
    const service = create('/es/blog/hola');
    service.setAlternates({ en: '/blog/hello', es: '/es/blog/hola' });
    expect(service.alternates()).toEqual({ en: '/blog/hello', es: '/es/blog/hola' });
  });

  it('localizes site paths to the page language', () => {
    expect(create('/es').href('/blog')).toBe('/es/blog');
  });

  it('marks only items in another language than the page', () => {
    const service = create('/es');
    expect(service.itemLang({ lang: 'en' })).toBe('en');
    expect(service.itemLang({ lang: 'es' })).toBeNull();
    expect(service.itemLang({})).toBeNull();
  });

  it('remembers the choice in a one-year cookie (RF-126)', () => {
    const service = create('/');
    const document = TestBed.inject(DOCUMENT);
    const cookie = vi.spyOn(document, 'cookie', 'set');

    service.remember('es');

    expect(cookie).toHaveBeenCalledWith(langCookie('es'));
    expect(langCookie('es')).toBe('lang=es; Max-Age=31536000; Path=/; SameSite=Lax; Secure');
  });
});
