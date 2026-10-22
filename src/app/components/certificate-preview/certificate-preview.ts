import { Component, inject, input, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { Certification } from '../../core/interfaces/content';
import { CertificateService } from '../../core/services/certificate.service';
import { certificateFileName } from '../../core/utils/file-name';
import { FilePreview } from '../file-preview/file-preview';

/**
 * A certification's file, PDF or image, in the dialog the resume preview uses (Spec 008, plan
 * D2). The file exists in one language only, so it is the same on every page (RF-05).
 */
@Component({
  selector: 'app-certificate-preview',
  imports: [FilePreview],
  templateUrl: './certificate-preview.html',
  // No box of its own, so it adds no gap next to the card's links.
  host: { class: 'contents' },
})
export class CertificatePreview {
  public readonly certification = input.required<Certification>();
  private readonly certificates = inject(CertificateService);
  private readonly language = inject(LanguageService);
  private readonly preview = viewChild.required(FilePreview);

  /** Opens the dialog and loads the file; focus returns to `trigger` when it closes. */
  public open(trigger: HTMLElement | null): void {
    const certification = this.certification();
    const { fileUrl, name } = certification;
    if (!fileUrl) return;
    this.preview().open(trigger, {
      title: name,
      lang: this.language.itemLang(certification),
      texts: this.language.m().certificatePreview,
      load: (signal) => this.certificates.load(fileUrl, signal),
      fileName: (file) => certificateFileName(name, file.mime),
      // A file the API serves but the browser cannot draw will not draw on Retry either (RF-33).
      renderFailure: 'unsupported',
    });
  }

  public close(): void {
    this.preview().close();
  }
}
