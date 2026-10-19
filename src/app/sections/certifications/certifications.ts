import { Component, computed, inject } from '@angular/core';
import { CertificationCard } from '../../components/certification-card/certification-card';
import { Certification } from '../../core/interfaces/content';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';

/** How many of the most recently issued certifications the home shows (Spec 007 RF-02). */
const HOME_CERTIFICATIONS = 3;

@Component({
  imports: [CertificationCard],
  selector: 'app-certifications',
  styleUrl: './certifications.css',
  templateUrl: './certifications.html',
})
export class Certifications {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  // The API returns them in the owner's order, so the home picks the latest itself (plan D2).
  private readonly all = inject(ContentService).collection<Certification>('certifications');
  public readonly certifications = computed(() =>
    [...this.all()]
      // `YYYY-MM-DD` compares chronologically as text; ties keep the owner's order (RF-03).
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || a.position - b.position)
      .slice(0, HOME_CERTIFICATIONS),
  );
}
