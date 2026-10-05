import { Component, input } from '@angular/core';
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
}
