import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Button } from '../../components/button/button';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';
import { HttpStatusService } from '../../core/services/http-status.service';
import { SeoService } from '../../core/services/seo.service';
import { accentTitle } from '../../core/utils/text';
import { NotFound } from '../not-found/not-found';
import { Unavailable } from '../unavailable/unavailable';

/** `/projects/<slug>`: a published project with its rendered body (RF-65, RF-66). */
@Component({
  imports: [Button, MarkdownBody, NotFound, Unavailable],
  selector: 'app-project-detail',
  templateUrl: './project-detail.html',
})
export class ProjectDetail {
  private readonly slug = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { requireSync: true },
  );
  protected readonly project = inject(ContentService).project(() => this.slug());

  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  /** The title with its last word in the serif accent, as the site's headings. */
  protected readonly heading = computed(() => accentTitle(this.project.value()?.title ?? ''));

  constructor() {
    const seo = inject(SeoService);
    const status = inject(HttpStatusService);
    effect(() => {
      const project = this.project.value();
      if (!project) return;
      // Each language has its own URL slug; the Spanish one falls back to the English slug.
      const alternates = {
        en: `/projects/${project.slug}`,
        es: `/es/projects/${project.slugEs ?? project.slug}`,
      };
      const lang = this.language.lang();
      // A Spanish URL with the English slug moves permanently to the Spanish slug (RF-175).
      if (lang === 'es' && this.slug() !== (project.slugEs ?? project.slug)) {
        status.redirect(alternates.es);
      }
      seo.set({
        title: project.title,
        description: project.description,
        path: alternates[lang],
        image: project.image,
        alternates,
      });
    });
  }
}
