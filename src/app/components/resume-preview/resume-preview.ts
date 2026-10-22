import { Component, inject, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PreviewResult } from '../../core/interfaces/file-preview';
import { ResumeService } from '../../core/services/resume.service';
import { FilePreview } from '../file-preview/file-preview';

/**
 * The current resume PDF in the page language, with Download and Close (Spec 006), drawn by the
 * dialog it shares with the certificate preview (plan 008 D2).
 */
@Component({
  selector: 'app-resume-preview',
  imports: [FilePreview],
  templateUrl: './resume-preview.html',
})
export class ResumePreview {
  private readonly resume = inject(ResumeService);
  private readonly language = inject(LanguageService);
  private readonly preview = viewChild.required(FilePreview);

  /** Opens the dialog and loads the resume; focus returns to `trigger` when it closes. */
  public open(trigger: HTMLElement | null): void {
    const texts = this.language.m().resumePreview;
    this.preview().open(trigger, {
      title: texts.title,
      lang: null,
      texts,
      load: async (signal): Promise<PreviewResult> => {
        const result = await this.resume.load(this.language.lang(), signal);
        return result.ok
          ? { ok: true, file: { kind: 'pdf', mime: 'application/pdf', data: result.data } }
          : result;
      },
      fileName: () => texts.fileName,
      // A resume that cannot be drawn shows the generic text, with Retry (Spec 006 RF-29).
      renderFailure: 'generic',
    });
  }

  public close(): void {
    this.preview().close();
  }
}
