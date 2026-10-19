import { Component, computed, inject } from '@angular/core';
import { CertificationCard } from '../../components/certification-card/certification-card';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { Unavailable } from '../unavailable/unavailable';

/** `/experience`: every entry, collapsed, and the certifications below (RF-70–RF-82). */
@Component({
  imports: [CertificationCard, MarkdownBody, Unavailable],
  selector: 'app-experience-page',
  templateUrl: './experience-page.html',
})
export class ExperiencePage {
  private readonly content = inject(ContentService);
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  protected readonly experiences = this.content.experiences();
  private readonly certifications = this.content.certifications();

  protected readonly unavailable = computed(
    () => !!this.experiences.error() || !!this.certifications.error(),
  );

  // The owner's order; each card formats its own dates (Spec 007 plan D3).
  protected readonly certificationCards = computed(() =>
    [...(this.certifications.value() ?? [])].sort((a, b) => a.position - b.position),
  );

  constructor() {
    const { seoTitle, seoDescription } = this.m().pages.experience;
    inject(SeoService).set({ title: seoTitle, description: seoDescription, path: '/experience' });
  }
}
