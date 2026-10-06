import { PlatformLocation } from '@angular/common';
import { DOCUMENT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      // The sections load their content over HTTP; keep the test off the network.
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Home SEO', () => {
  const render = async (pathname: string): Promise<Document> => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return TestBed.inject(DOCUMENT);
  };
  const href = (document: Document, selector: string) =>
    document.head.querySelector(selector)?.getAttribute('href');

  afterEach(() => {
    const head = TestBed.inject(DOCUMENT).head;
    head
      .querySelectorAll('meta, link[rel="canonical"], link[hreflang]')
      .forEach((el) => el.remove());
  });

  it('keeps the English title and declares both versions (RF-136 to RF-139)', async () => {
    const document = await render('/');

    expect(document.title).toBe('Marco Figueroa — Full-Stack Developer');
    expect(href(document, 'link[rel="canonical"]')).toBe('https://marco.figueroa-sanchez.com/');
    expect(href(document, 'link[hreflang="en"]')).toBe('https://marco.figueroa-sanchez.com/');
    expect(href(document, 'link[hreflang="es"]')).toBe('https://marco.figueroa-sanchez.com/es');
    expect(href(document, 'link[hreflang="x-default"]')).toBe(
      'https://marco.figueroa-sanchez.com/',
    );
  });

  it('uses the Spanish texts and canonical URL under /es (RF-140, RF-142)', async () => {
    const document = await render('/es');

    expect(document.title).toBe('Marco Figueroa — Desarrollador Full-Stack');
    expect(href(document, 'link[rel="canonical"]')).toBe('https://marco.figueroa-sanchez.com/es');
    expect(document.head.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'es_ES',
    );
    expect(document.documentElement.lang).toBe('es');
  });
});
