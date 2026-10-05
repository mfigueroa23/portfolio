import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Button } from '../../components/button/button';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { ContentService } from '../../core/services/content.service';
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

  /** The title with its last word in the serif accent, as the site's headings. */
  protected readonly heading = computed(() => accentTitle(this.project.value()?.title ?? ''));

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const project = this.project.value();
      if (!project) return;
      seo.set({
        title: project.title,
        description: project.description,
        path: `/projects/${project.slug}`,
        image: project.image,
      });
    });
  }
}
