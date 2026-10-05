import { Component, computed, inject } from '@angular/core';
import { Experience as ExperienceItem } from '../../core/interfaces/content';
import { ContentService } from '../../core/services/content.service';

/** How many of the most recent entries the home shows (RF-68). */
const HOME_ENTRIES = 4;

@Component({
  imports: [],
  selector: 'app-experience',
  styleUrl: './experience.css',
  templateUrl: './experience.html',
})
export class Experience {
  // The API returns current entries first, then by start date (RF-141).
  private readonly all = inject(ContentService).collection<ExperienceItem>('experiences');
  public readonly experiences = computed(() => this.all().slice(0, HOME_ENTRIES));
}
