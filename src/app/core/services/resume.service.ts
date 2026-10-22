import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api';
import { Lang } from '../i18n/language';
import { ResumeResult } from '../interfaces/resume';
import { FILE_TIMEOUT_MS, getBinary } from './binary-request';

/** How long the resume may take before the request is aborted (Spec 006 RF-30). */
export const RESUME_TIMEOUT_MS = FILE_TIMEOUT_MS;

/** Loads the current resume PDF (`GET {API_URL}/resume`, api Spec 005). */
@Injectable({ providedIn: 'root' })
export class ResumeService {
  private readonly http = inject(HttpClient);
  /** Bytes of each language's last successful load (RF-05, plan D6). */
  private readonly loaded = new Map<Lang, Uint8Array<ArrayBuffer>>();

  /**
   * The resume in `lang`; Spanish may come back as the English PDF (api fallback, RF-13).
   * Resolves with the outcome and never rejects (plan D4). Aborting `signal` cancels the request
   * (RF-20, plan D5) and resolves with a generic failure that the closed preview drops.
   */
  public async load(lang: Lang, signal: AbortSignal): Promise<ResumeResult> {
    const cached = this.loaded.get(lang);
    if (cached) return { ok: true, data: cached };
    const result = await getBinary(this.http, `${API_URL}/resume`, { params: { lang } }, signal);
    if (!result.ok) return result;
    const data = new Uint8Array(result.body);
    this.loaded.set(lang, data);
    return { ok: true, data };
  }
}
