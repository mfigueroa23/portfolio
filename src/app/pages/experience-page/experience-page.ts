import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { MarkdownBody } from '../../components/markdown-body/markdown-body';
import { Certification } from '../../core/interfaces/content';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { formatCalendarDate, isExpired } from '../../core/utils/dates';
import { Unavailable } from '../unavailable/unavailable';

interface CertificationCard extends Certification {
  issued: string;
  expires: string | null;
  expired: boolean;
}

/** `/experience`: every entry, collapsed, and the certifications below (RF-70–RF-82). */
@Component({
  imports: [MarkdownBody, Unavailable],
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

  // The server only knows UTC; after rendering, the browser uses the visitor's zone (RF-82).
  private readonly timeZone = signal<string | undefined>('UTC');

  protected readonly certificationCards = computed<CertificationCard[]>(() => {
    const now = new Date();
    const timeZone = this.timeZone();
    const lang = this.language.lang();
    return [...(this.certifications.value() ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((certification) => ({
        ...certification,
        issued: formatCalendarDate(certification.issueDate, lang),
        expires: certification.expiryDate
          ? formatCalendarDate(certification.expiryDate, lang)
          : null,
        expired: isExpired(certification.expiryDate, now, timeZone),
      }));
  });

  constructor() {
    afterNextRender(() => this.timeZone.set(undefined));
    const { seoTitle, seoDescription } = this.m().pages.experience;
    inject(SeoService).set({ title: seoTitle, description: seoDescription, path: '/experience' });
  }
}
