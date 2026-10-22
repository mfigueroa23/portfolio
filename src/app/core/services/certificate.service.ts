import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PreviewFile, PreviewResult } from '../interfaces/file-preview';
import { getBinary } from './binary-request';

/** The image types the API stores, which the browser decodes in an `<img>` (Spec 008 RF-11). */
const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

/** Loads a certificate file from its `fileUrl` on the API (Spec 008). */
@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly http = inject(HttpClient);
  /** Files of successful loads by URL; `/files/:id` never changes content (RF-06, plan D5). */
  private readonly loaded = new Map<string, PreviewFile>();

  /**
   * The file at `fileUrl`, requested as is: a certificate exists in one language only (RF-05).
   * Resolves with the outcome and never rejects. The kind comes from the content type, which the
   * API sniffed on upload (plan D4); any other type is `unsupported` (RF-33).
   */
  public async load(fileUrl: string, signal: AbortSignal): Promise<PreviewResult> {
    const cached = this.loaded.get(fileUrl);
    if (cached) return { ok: true, file: cached };
    const result = await getBinary(this.http, fileUrl, {}, signal);
    if (!result.ok) return result;

    const mime = (result.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    const kind = mime === 'application/pdf' ? 'pdf' : IMAGE_TYPES.has(mime) ? 'image' : null;
    if (!kind) return { ok: false, reason: 'unsupported' };
    const file: PreviewFile = { kind, mime, data: new Uint8Array(result.body) };
    this.loaded.set(fileUrl, file);
    return { ok: true, file };
  }
}
