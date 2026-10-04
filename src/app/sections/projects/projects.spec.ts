import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentService } from '../../core/services/content.service';
import { Project } from '../../core/interfaces/content';
import { Projects } from './projects';

describe('Projects', () => {
  const items: Project[] = [
    {
      id: 1,
      slug: 'portfolio',
      title: 'Portfolio',
      description: 'This site.',
      image: '/projects/portfolio.webp',
      tags: ['Angular', 'Tailwind'],
      link: 'https://example.com',
      github: 'https://example.com/repo',
      publishedAt: '2026-10-01T12:00:00.000Z',
    },
  ];
  let collection: ReturnType<typeof vi.fn>;

  const render = async (data: Project[]): Promise<ComponentFixture<Projects>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [{ provide: ContentService, useValue: { collection } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the projects from the API', async () => {
    const fixture = await render(items);
    const element: HTMLElement = fixture.nativeElement;

    expect(collection).toHaveBeenCalledWith('projects');
    expect(element.textContent).toContain('Portfolio');
    expect(element.textContent).toContain('Tailwind');
    expect(element.querySelector('img[alt="Portfolio"]')?.getAttribute('src')).toBe(
      '/projects/portfolio.webp',
    );
    expect(element.textContent).not.toContain('Projects coming soon');
  });

  it('shows the empty state when there are no projects', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Projects coming soon');
    expect(element.querySelector('img')).toBeNull();
  });
});
