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

  const render = async (data: ExperienceItem[]): Promise<ComponentFixture<Experience>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Experience],
      providers: [{ provide: ContentService, useValue: { collection } }],
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

  it('shows the empty state when there are no experiences', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Experience coming soon');
    expect(element.textContent).not.toContain('Platform Engineer');
  });
});
