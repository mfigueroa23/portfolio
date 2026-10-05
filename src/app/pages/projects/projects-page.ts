import { Component, inject } from '@angular/core';
import { ProjectCard } from '../../components/project-card/project-card';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { Unavailable } from '../unavailable/unavailable';

/** `/projects`: every published project, newest first (RF-63). */
@Component({
  imports: [ProjectCard, Unavailable],
  selector: 'app-projects-page',
  templateUrl: './projects-page.html',
})
export class ProjectsPage {
  protected readonly projects = inject(ContentService).projects();

  constructor() {
    inject(SeoService).set({
      title: 'Projects',
      description:
        'Every project by Marco Figueroa in depth: the problem, the architecture and what I learned.',
      path: '/projects',
    });
  }
}
