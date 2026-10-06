import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TestimonialDialog } from '../../components/testimonial-dialog/testimonial-dialog';
import { TestimonialService } from '../../core/services/testimonial.service';
import { ContentService } from '../../core/services/content.service';
import { Testimonial } from '../../core/interfaces/content';
import { Testimonials } from './testimonials';

describe('Testimonials', () => {
  const items: Testimonial[] = [
    { id: 1, position: 0, quote: 'First quote', author: 'Ada', role: 'CTO', avatar: '/a.webp' },
    { id: 2, position: 1, quote: 'Second quote', author: 'Linus', role: 'Dev', avatar: '/l.webp' },
  ];
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: Testimonial[]): Promise<ComponentFixture<Testimonials>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Testimonials],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: TestimonialService, useValue: { submit: vi.fn() } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Testimonials);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the first testimonial from the API', async () => {
    const fixture = await render(items);
    const element: HTMLElement = fixture.nativeElement;

    expect(collection).toHaveBeenCalledWith('testimonials');
    expect(element.querySelector('blockquote')?.textContent).toContain('First quote');
    expect(element.textContent).toContain('Ada');
    expect(element.querySelectorAll('[aria-label^="Show testimonial"]').length).toBe(2);
    expect(element.textContent).not.toContain('Testimonials coming soon');
  });

  it('navigates between testimonials and wraps around', async () => {
    const fixture = await render(items);
    const element: HTMLElement = fixture.nativeElement;
    const click = async (label: string): Promise<void> => {
      element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
      await fixture.whenStable();
    };

    await click('Next testimonial');
    expect(element.querySelector('blockquote')?.textContent).toContain('Second quote');
    await click('Next testimonial');
    expect(element.querySelector('blockquote')?.textContent).toContain('First quote');
    await click('Previous testimonial');
    expect(element.querySelector('blockquote')?.textContent).toContain('Second quote');
  });

  it('shows the empty state when there are no testimonials', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Testimonials coming soon');
    expect(element.querySelector('blockquote')).toBeNull();
  });

  describe('avatar and quote', () => {
    const noPhoto: Testimonial = {
      id: 3,
      position: 0,
      quote: '<b>Bold</b> **claim** with averyveryverylongwordthatcouldoverflowthecard',
      author: 'Ana María López',
      role: '<i>Lead</i>',
      avatar: null,
    };

    it('shows the photo when the testimonial has one (RF-90)', async () => {
      const fixture = await render(items);
      const img = (fixture.nativeElement as HTMLElement).querySelector('article img');

      expect(img?.getAttribute('src')).toBe('/a.webp');
      expect(img?.getAttribute('alt')).toBe('Ada');
    });

    it('shows the initials, named after the author, without a photo (RF-91, RF-93)', async () => {
      const fixture = await render([noPhoto]);
      const element: HTMLElement = fixture.nativeElement;
      const avatar = element.querySelector('span[role="img"]');

      expect(element.querySelector('article img')).toBeNull();
      expect(avatar?.textContent?.trim()).toBe('AL');
      expect(avatar?.getAttribute('aria-label')).toBe('Ana María López');
    });

    it('renders quote, name and role as plain text (RF-95)', async () => {
      const fixture = await render([noPhoto]);
      const element: HTMLElement = fixture.nativeElement;
      const quote = element.querySelector('blockquote')!;

      expect(quote.textContent).toContain('<b>Bold</b> **claim**');
      expect(quote.querySelector('b')).toBeNull();
      expect(element.textContent).toContain('<i>Lead</i>');
      expect(element.querySelector('i:not([class])')).toBeNull();
    });

    it('wraps long words inside the card (RF-94)', async () => {
      const fixture = await render([noPhoto]);
      const quote = (fixture.nativeElement as HTMLElement).querySelector('blockquote')!;

      expect(getComputedStyle(quote).overflowWrap).toBe('anywhere');
    });
  });

  describe('leave a testimonial button', () => {
    const button = (element: HTMLElement): HTMLButtonElement | undefined =>
      Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Leave a testimonial'),
      );

    it('is absent before the page is interactive (RF-3)', async () => {
      const global = globalThis as { ngServerMode?: boolean };
      global.ngServerMode = true;
      try {
        const fixture = await render(items);
        const element: HTMLElement = fixture.nativeElement;

        expect(element.querySelector('blockquote')).toBeTruthy();
        expect(button(element)).toBeUndefined();
        expect(element.querySelector('dialog')).toBeNull();
      } finally {
        delete global.ngServerMode;
      }
    });

    it('is shown with the carousel (RF-1)', async () => {
      const fixture = await render(items);
      expect(button(fixture.nativeElement)).toBeTruthy();
    });

    it('is shown in the empty state (RF-2)', async () => {
      const fixture = await render([]);
      expect(button(fixture.nativeElement)).toBeTruthy();
    });

    it('opens the dialog (RF-4)', async () => {
      const fixture = await render([]);
      const element: HTMLElement = fixture.nativeElement;
      const dialog: TestimonialDialog = fixture.debugElement.query(
        By.directive(TestimonialDialog),
      ).componentInstance;
      const trigger = button(element)!;
      const open = vi.spyOn(dialog, 'open').mockImplementation(() => {});

      trigger.click();
      await fixture.whenStable();

      expect(open).toHaveBeenCalledWith(trigger);
    });
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and the carousel labels (RF-131)', async () => {
      const fixture = await render([{ ...items[0], lang: 'en' }, items[1]]);
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('Lo que dicen');
      expect(element.querySelector('[aria-label="Testimonio siguiente"]')).not.toBeNull();
      expect(element.querySelector('[aria-label="Ver testimonio 2"]')).not.toBeNull();
      expect(element.textContent).toContain('Deja un testimonio');
      expect(element.querySelector('blockquote')?.closest('article')?.getAttribute('lang')).toBe(
        'en',
      );
    });
  });
});
