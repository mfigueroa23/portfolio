import { Component, inject } from '@angular/core';
import { ProjectCard } from '../../components/project-card/project-card';
import { LanguageService } from '../../core/i18n/language.service';
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
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  constructor() {
    const { seoTitle, seoDescription } = this.m().pages.projects;
    inject(SeoService).set({ title: seoTitle, description: seoDescription, path: '/projects' });
  }
}
