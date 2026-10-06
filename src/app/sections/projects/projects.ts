import { Component, computed, inject } from '@angular/core';
import { AnimatedButton } from '../../components/animated-button/animated-button';
import { ProjectCard } from '../../components/project-card/project-card';
import { Project } from '../../core/interfaces/content';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';

/** How many of the latest published projects the home shows (RF-61). */
const HOME_PROJECTS = 4;

@Component({
  imports: [AnimatedButton, ProjectCard],
  selector: 'app-projects',
  styleUrl: './projects.css',
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  // The API returns the latest projects first (RF-142).
  private readonly latest = inject(ContentService).collection<Project>('projects', {
    limit: HOME_PROJECTS,
  });
  public readonly projects = computed(() => this.latest().slice(0, HOME_PROJECTS));
}
