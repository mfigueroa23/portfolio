import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RESPONSE_INIT } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ApiError, ContentService } from '../../core/services/content.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { SeoService } from '../../core/services/seo.service';
import { ProjectDetail as Detail } from '../../core/interfaces/content';
import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  const full: Detail = {
    id: 1,
    slug: 'portfolio',
    title: 'Portfolio platform',
    description: 'Public site, panel and API.',
    image: 'https://api.example.com/files/cover',
    tags: ['Angular', 'NestJS'],
    link: 'https://marco.figueroa-sanchez.com',
    github: 'https://github.com/example/portfolio',
    publishedAt: '2026-10-01T12:00:00.000Z',
    body: '## The problem',
    bodyHtml: '<h2 id="the-problem">The problem</h2>',
  };
  let seo: { set: ReturnType<typeof vi.fn> };
  let project: ReturnType<typeof vi.fn>;
  let init: ResponseInit;

  const render = async (value: Detail | undefined, error: ApiError | null = null) => {
    seo = { set: vi.fn() };
    init = { status: 200 };
    project = vi.fn(() => ({
      value: signal(value),
      error: signal(error),
      isLoading: signal(false),
    }));
    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        { provide: ContentService, useValue: { project } },
        { provide: SeoService, useValue: seo },
        { provide: MermaidService, useValue: { renderIn: vi.fn() } },
        { provide: RESPONSE_INIT, useValue: init },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'portfolio' })) },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectDetail);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('loads the project of the URL slug', async () => {
    await render(full);
    const slug = project.mock.calls[0][0] as () => string;
    expect(slug()).toBe('portfolio');
  });

  it('shows title, cover, tags, description, links and rendered body', async () => {
    const element = await render(full);

    expect(element.querySelector('h1')?.textContent).toContain('Portfolio platform');
    expect(element.querySelector('img')?.getAttribute('src')).toBe(full.image);
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Portfolio platform');
    expect(element.textContent).toContain('NestJS');
    expect(element.textContent).toContain('Public site, panel and API.');
    const live = element.querySelector(`a[href="${full.link}"]`);
    expect(live?.textContent).toContain('Live site');
    expect(live?.getAttribute('target')).toBe('_blank');
    expect(element.querySelector(`a[href="${full.github}"]`)?.textContent).toContain('Source code');
    expect(element.querySelector('app-markdown-body h2#the-problem')).not.toBeNull();
  });

  it('hides the links and the body when the project has none', async () => {
    const element = await render({ ...full, link: null, github: null, body: null, bodyHtml: null });

    expect(element.textContent).not.toContain('Live site');
    expect(element.textContent).not.toContain('Source code');
    expect(element.querySelector('app-markdown-body')).toBeNull();
  });

  it("shares the project's title, description and image", async () => {
    await render(full);
    expect(seo.set).toHaveBeenCalledWith({
      title: 'Portfolio platform',
      description: 'Public site, panel and API.',
      path: '/projects/portfolio',
      image: full.image,
    });
  });

  it('answers 404 with the not-found page for a missing or draft project', async () => {
    const element = await render(undefined, 'notFound');
    expect(init.status).toBe(404);
    expect(element.textContent).toContain('Page not found');
  });

  it('answers 503 when the API is unreachable', async () => {
    const element = await render(undefined, 'unavailable');
    expect(init.status).toBe(503);
    expect(element.textContent).toContain('Temporarily unavailable');
  });
});
