import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentService } from '../../core/services/content.service';
import { Highlight } from '../../core/interfaces/content';
import { About } from './about';

describe('About', () => {
  const items: Highlight[] = [
    { id: 1, position: 0, icon: 'fa-solid fa-code', title: 'Testing', description: 'Specs first.' },
    { id: 2, position: 1, icon: 'fa-solid fa-server', title: 'Uptime', description: 'Always on.' },
  ];
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: Highlight[]): Promise<ComponentFixture<About>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the highlights from the API', async () => {
    const fixture = await render(items);
    const element: HTMLElement = fixture.nativeElement;

    expect(collection).toHaveBeenCalledWith('highlights');
    expect(element.querySelectorAll('h3').length).toBe(2);
    expect(element.textContent).toContain('Testing');
    expect(element.textContent).toContain('Always on.');
    expect(element.textContent).not.toContain('Highlights coming soon');
  });

  it('shows the empty state when there are no highlights', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Highlights coming soon');
    expect(element.textContent).not.toContain('Specs first.');
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts (RF-131)', async () => {
      const fixture = await render([]);
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('Sobre mí');
      expect(element.textContent).toContain('Destacados próximamente');
    });

    it('marks highlights shown in English (RF-152)', async () => {
      const fixture = await render([
        { ...items[0], lang: 'en' },
        { ...items[1], lang: 'es' },
      ]);
      const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('h3');

      expect(cards[0].closest('article')?.getAttribute('lang')).toBe('en');
      expect(cards[1].closest('article')?.hasAttribute('lang')).toBe(false);
    });
  });
});
