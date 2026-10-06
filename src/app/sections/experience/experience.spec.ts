import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentService } from '../../core/services/content.service';
import { Experience as ExperienceItem } from '../../core/interfaces/content';
import { Experience } from './experience';

describe('Experience', () => {
  const items: ExperienceItem[] = [
    {
      id: 1,
      startDate: '2026-01',
      period: '2026 — Present',
      role: 'Platform Engineer',
      company: 'Acme',
      description: 'Runs the platform.',
      technologies: ['Kubernetes', 'Terraform'],
      current: true,
    },
    {
      id: 2,
      startDate: '2024-03',
      period: '2024 — 2025',
      role: 'Support Agent',
      company: 'Globex',
      description: 'Helped customers.',
      technologies: ['Support'],
      current: false,
    },
  ];
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: ExperienceItem[]): Promise<ComponentFixture<Experience>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Experience],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Experience);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the experiences from the API', async () => {
    const fixture = await render(items);
    const element: HTMLElement = fixture.nativeElement;

    expect(collection).toHaveBeenCalledWith('experiences');
    expect(element.textContent).toContain('Platform Engineer');
    expect(element.textContent).toContain('Globex');
    expect(element.textContent).toContain('Terraform');
    expect(element.querySelectorAll('.animate-ping').length).toBe(1);
    expect(element.textContent).not.toContain('Experience coming soon');
  });

  const entry = (id: number): ExperienceItem => ({
    ...items[1],
    id,
    role: `Role ${id}`,
    current: false,
  });

  it('shows only the 4 most recent entries, in the API order', async () => {
    const fixture = await render([1, 2, 3, 4, 5, 6].map(entry));
    const roles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3'), (h3) =>
      h3.textContent?.trim(),
    );
    expect(roles).toEqual(['Role 1', 'Role 2', 'Role 3', 'Role 4']);
  });

  it('shows "View more" linking to /experience when there is at least one entry', async () => {
    const fixture = await render([entry(1)]);
    const more = (fixture.nativeElement as HTMLElement).querySelector('a[href="/experience"]');
    expect(more?.textContent).toContain('View more');
  });

  it('shows the empty state when there are no experiences', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Experience coming soon');
    expect(element.textContent).not.toContain('Platform Engineer');
    expect(element.querySelector('a[href="/experience"]')).toBeNull();
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish page (RF-131)', async () => {
      const fixture = await render([{ ...items[0], lang: 'en' }]);
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('Trayectoria');
      expect(element.querySelector('a[href="/es/experience"]')?.textContent).toContain('Ver más');
      expect(element.querySelector('h3')?.closest('article')?.getAttribute('lang')).toBe('en');
    });
  });
});
