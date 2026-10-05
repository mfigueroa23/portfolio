import { TestBed } from '@angular/core/testing';
import { Project } from '../../core/interfaces/content';
import { ProjectCard } from './project-card';

describe('ProjectCard', () => {
  const project: Project = {
    id: 1,
    slug: 'portfolio',
    title: 'Portfolio',
    description: 'This site.',
    image: '/p.webp',
    tags: ['Angular', 'NestJS'],
    link: null,
    github: null,
    publishedAt: '2026-10-01T12:00:00.000Z',
  };

  const render = async (level?: 2 | 3) => {
    await TestBed.configureTestingModule({ imports: [ProjectCard] }).compileComponents();
    const fixture = TestBed.createComponent(ProjectCard);
    fixture.componentRef.setInput('project', project);
    if (level) fixture.componentRef.setInput('headingLevel', level);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('links the whole card to the project detail', async () => {
    const element = await render();
    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/projects/portfolio');
    expect(link?.querySelector('img')?.getAttribute('alt')).toBe('Portfolio');
    expect(link?.textContent).toContain('This site.');
    expect(link?.textContent).toContain('NestJS');
  });

  it('uses the requested heading level', async () => {
    expect((await render()).querySelector('h3')?.textContent).toContain('Portfolio');
    TestBed.resetTestingModule();
    expect((await render(2)).querySelector('h2')?.textContent).toContain('Portfolio');
  });
});
