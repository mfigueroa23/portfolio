import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentService } from '../../core/services/content.service';
import { Project } from '../../core/interfaces/content';
import { Projects } from './projects';

describe('Projects', () => {
  const project = (id: number): Project => ({
    id,
    slug: `project-${id}`,
    title: `Project ${id}`,
    description: `Description ${id}.`,
    image: `/projects/${id}.webp`,
    tags: ['Angular', 'Tailwind'],
    link: 'https://example.com',
    github: null,
    publishedAt: '2026-10-01T12:00:00.000Z',
  });
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: Project[]): Promise<ComponentFixture<Projects>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    return fixture;
  };

  it('asks the API for the 4 latest projects', async () => {
    await render([]);
    expect(collection).toHaveBeenCalledWith('projects', { limit: 4 });
  });

  it('renders the projects from the API', async () => {
    const fixture = await render([project(1)]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Project 1');
    expect(element.textContent).toContain('Tailwind');
    expect(element.querySelector('img[alt="Project 1"]')?.getAttribute('src')).toBe(
      '/projects/1.webp',
    );
    expect(element.textContent).not.toContain('Projects coming soon');
  });

  it('shows at most 4 projects, in the API order', async () => {
    const fixture = await render([1, 2, 3, 4, 5].map(project));
    const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3'), (h3) =>
      h3.textContent?.trim(),
    );
    expect(titles).toEqual(['Project 1', 'Project 2', 'Project 3', 'Project 4']);
  });

  it('links each card to its detail page', async () => {
    const fixture = await render([project(1), project(2)]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[href="/projects/project-1"]')?.textContent).toContain(
      'Project 1',
    );
    expect(element.querySelector('a[href="/projects/project-2"]')).not.toBeNull();
  });

  it('shows "View more projects" when there is at least one project', async () => {
    const fixture = await render([project(1)]);
    const more = (fixture.nativeElement as HTMLElement).querySelector('a[href="/projects"]');
    expect(more?.textContent).toContain('View more projects');
  });

  it('shows the empty state without "View more projects" when there are no projects', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Projects coming soon');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('a[href="/projects"]')).toBeNull();
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish pages (RF-131)', async () => {
      const fixture = await render([{ ...project(1), slugEs: 'proyecto-1', lang: 'es' }]);
      const element: HTMLElement = fixture.nativeElement;

      expect(element.textContent).toContain('generan impacto.');
      expect(element.querySelector('a[href="/es/projects"]')?.textContent).toContain(
        'Ver más proyectos',
      );
      expect(element.querySelector('a[href="/es/projects/proyecto-1"]')).not.toBeNull();
    });

    it('shows the Spanish empty state', async () => {
      const fixture = await render([]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Proyectos próximamente',
      );
    });
  });
});
