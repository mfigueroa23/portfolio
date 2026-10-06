import { Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { Project } from '../../core/interfaces/content';

/** A project card linking to its detail page; used on the home and on `/projects`. */
@Component({
  selector: 'app-project-card',
  templateUrl: './project-card.html',
})
export class ProjectCard {
  public readonly project = input.required<Project>();
  /** Heading level of the title under the page's headings. */
  public readonly headingLevel = input<2 | 3>(3);
  protected readonly language = inject(LanguageService);
  /** The detail URL in the page language, with the Spanish slug under `/es` (RF-169). */
  protected readonly href = computed(() => {
    const { slug, slugEs } = this.project();
    return this.language.href(
      `/projects/${this.language.lang() === 'es' ? (slugEs ?? slug) : slug}`,
    );
  });
}
