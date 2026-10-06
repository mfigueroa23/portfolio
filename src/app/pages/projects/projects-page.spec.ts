import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RESPONSE_INIT } from '@angular/core';
import { ApiError, ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { Project } from '../../core/interfaces/content';
import { ProjectsPage } from './projects-page';

describe('ProjectsPage', () => {
  const project = (id: number): Project => ({
    id,
    slug: `project-${id}`,
    title: `Project ${id}`,
    description: `Description ${id}.`,
    image: `/p${id}.webp`,
    tags: ['Angular'],
    link: null,
    github: null,
    publishedAt: '2026-10-01T12:00:00.000Z',
  });
  let seo: { set: ReturnType<typeof vi.fn> };
  let init: ResponseInit;
  let pathname = '/';

  const render = async (value: Project[] | undefined, error: ApiError | null = null) => {
    seo = { set: vi.fn() };
    init = { status: 200 };
    const projects = vi.fn(() => ({
      value: signal(value),
      error: signal(error),
      isLoading: signal(false),
    }));
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        { provide: ContentService, useValue: { projects } },
        { provide: SeoService, useValue: seo },
        { provide: RESPONSE_INIT, useValue: init },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectsPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('lists every published project in the API order, linked to its detail', async () => {
    const element = await render([1, 2, 3, 4, 5, 6].map(project));
    const links = Array.from(element.querySelectorAll('a[href^="/projects/"]'), (a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual([1, 2, 3, 4, 5, 6].map((id) => `/projects/project-${id}`));
    expect(element.querySelector('h1')?.textContent).toContain('Every project');
  });

  it('sets its title, description and canonical path', async () => {
    await render([]);
    expect(seo.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Projects', path: '/projects' }),
    );
  });

  it('shows an empty state when no project is published', async () => {
    const element = await render([]);
    expect(element.textContent).toContain('Projects coming soon');
  });

  it('answers 503 when the API is unreachable', async () => {
    const element = await render(undefined, 'unavailable');
    expect(init.status).toBe(503);
    expect(element.textContent).toContain('Temporarily unavailable');
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es/projects'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish pages (RF-131)', async () => {
      const element = await render([{ ...project(1), slugEs: 'proyecto-1', lang: 'es' }]);

      expect(element.querySelector('h1')?.textContent).toContain('Cada proyecto,');
      expect(element.querySelector('a[href="/es"]')?.textContent).toContain('Volver al inicio');
      expect(element.querySelector('a[href="/es/projects/proyecto-1"]')).not.toBeNull();
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Proyectos', path: '/projects' }),
      );
    });

    it('shows the Spanish 503 page (RF-146)', async () => {
      const element = await render(undefined, 'unavailable');
      expect(init.status).toBe(503);
      expect(element.textContent).toContain('No disponible por ahora');
    });
  });
});
