import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentService } from '../../core/services/content.service';
import { ContentCollection, SocialLink, Technology } from '../../core/interfaces/content';
import { Hero } from './hero';

describe('Hero', () => {
  const links: SocialLink[] = [
    { id: 1, position: 0, icon: 'fa-brands fa-github', href: 'https://example.com/gh' },
    { id: 2, position: 1, icon: 'fa-brands fa-linkedin', href: 'https://example.com/in' },
  ];
  const technologies: Technology[] = [
    { id: 1, position: 0, name: 'Angular' },
    { id: 2, position: 1, name: 'NestJS' },
    { id: 3, position: 2, name: 'Docker' },
  ];
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (
    data: Partial<Record<ContentCollection, unknown[]>>,
  ): Promise<ComponentFixture<Hero>> => {
    collection = vi.fn((name: ContentCollection) => signal(data[name] ?? []));
    await TestBed.configureTestingModule({
      imports: [Hero],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Hero);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the social links and technologies from the API', async () => {
    const fixture = await render({ 'social-links': links, technologies });
    const element: HTMLElement = fixture.nativeElement;

    expect(collection).toHaveBeenCalledWith('social-links');
    expect(collection).toHaveBeenCalledWith('technologies');
    expect(element.querySelector('a[href="https://example.com/gh"]')).toBeTruthy();
    expect(element.querySelector('a[href="https://example.com/in"] .fa-linkedin')).toBeTruthy();
    expect(element.textContent).toContain('NestJS');
    expect(element.textContent).not.toContain('Links coming soon');
    expect(element.textContent).not.toContain('Technologies coming soon');
  });

  it('duplicates the technologies for the marquee', async () => {
    const fixture = await render({ technologies });
    const stack = fixture.componentInstance.techStack();

    expect(stack.length).toBe(2 * technologies.length);
    expect(stack.map((tech) => tech.name)).toEqual([
      'Angular',
      'NestJS',
      'Docker',
      'Angular',
      'NestJS',
      'Docker',
    ]);
  });

  it('shows an empty state for each list when the API returns nothing', async () => {
    const fixture = await render({});
    const element: HTMLElement = fixture.nativeElement;

    expect(fixture.componentInstance.techStack()).toEqual([]);
    expect(element.textContent).toContain('Links coming soon');
    expect(element.textContent).toContain('Technologies coming soon');
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish contact form (RF-131)', async () => {
      const fixture = await render({});
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('Disponible para trabajar');
      expect(element.textContent).toContain('Enlaces próximamente.');
      expect(element.querySelector('a[href="/es#contact"]')?.textContent).toContain('Contáctame');
      expect(
        element.querySelector('img[alt="Marco Figueroa, desarrollador full-stack"]'),
      ).toBeTruthy();
    });
  });
});
