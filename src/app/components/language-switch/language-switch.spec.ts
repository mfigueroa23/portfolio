import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { LanguageSwitch } from './language-switch';

describe('LanguageSwitch', () => {
  const render = async (pathname: string) => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitch],
      providers: [{ provide: PlatformLocation, useValue: { pathname } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LanguageSwitch);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const link = (label: string) =>
      Array.from(element.querySelectorAll('a')).find((a) => a.textContent?.trim() === label)!;
    return { fixture, element, link };
  };

  it('links EN and ES to the same page in each language (RF-121, RF-124)', async () => {
    const { link } = await render('/es/blog/tag/angular');
    expect(link('EN').getAttribute('href')).toBe('/blog/tag/angular');
    expect(link('ES').getAttribute('href')).toBe('/es/blog/tag/angular');
  });

  it('marks the current language visually and for screen readers (RF-122, RF-123)', async () => {
    const { link, element } = await render('/es');
    expect(link('ES').getAttribute('aria-current')).toBe('true');
    expect(link('ES').className).toContain('text-primary');
    expect(link('EN').hasAttribute('aria-current')).toBe(false);
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Idioma');
    expect(link('EN').getAttribute('lang')).toBe('en');
    expect(link('ES').getAttribute('lang')).toBe('es');
  });

  it('keeps the same path on the not-found page (RF-125)', async () => {
    const { link } = await render('/es/no-such-page');
    expect(link('EN').getAttribute('href')).toBe('/no-such-page');
  });

  it("follows the page's alternates, e.g. a post's slugs (RF-176)", async () => {
    const { fixture, link } = await render('/blog/hello');
    TestBed.inject(LanguageService).setAlternates({ en: '/blog/hello', es: '/es/blog/hola' });
    await fixture.whenStable();
    expect(link('ES').getAttribute('href')).toBe('/es/blog/hola');
  });

  it('remembers the chosen language (RF-126)', async () => {
    const { link } = await render('/');
    const remember = vi.spyOn(TestBed.inject(LanguageService), 'remember');
    const es = link('ES');
    es.addEventListener('click', (event) => event.preventDefault());
    es.click();
    expect(remember).toHaveBeenCalledWith('es');
  });
});
