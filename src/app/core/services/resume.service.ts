import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, fromEvent, takeUntil, timeout, TimeoutError } from 'rxjs';
import { API_URL } from '../config/api';
import { Lang } from '../i18n/language';
import { ResumeResult } from '../interfaces/resume';

/** How long the resume may take before the request is aborted (Spec 006 RF-30). */
export const RESUME_TIMEOUT_MS = 30_000;

const GENERIC: ResumeResult = { ok: false, reason: 'generic' };

/** Loads the current resume PDF (`GET {API_URL}/resume`, api Spec 005). */
@Injectable({ providedIn: 'root' })
export class ResumeService {
  private readonly http = inject(HttpClient);
  /** Bytes of each language's last successful load (RF-05, plan D6). */
  private readonly loaded = new Map<Lang, Uint8Array>();

  /**
   * The resume in `lang`; Spanish may come back as the English PDF (api fallback, RF-13).
   * Resolves with the outcome and never rejects (plan D4). Aborting `signal` cancels the request
   * (RF-20, plan D5) and resolves with a generic failure that the closed preview drops.
   */
  public async load(lang: Lang, signal: AbortSignal): Promise<ResumeResult> {
    const cached = this.loaded.get(lang);
    if (cached) return { ok: true, data: cached };
    if (signal.aborted) return GENERIC;
    try {
      const body = await firstValueFrom(
        this.http
          .get(`${API_URL}/resume`, { params: { lang }, responseType: 'arraybuffer' })
          .pipe(timeout(RESUME_TIMEOUT_MS), takeUntil(fromEvent(signal, 'abort'))),
      );
      const data = new Uint8Array(body);
      this.loaded.set(lang, data);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof TimeoutError) return { ok: false, reason: 'timeout' };
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return { ok: false, reason: 'not-found' };
      }
      // Any other status, a network or CORS failure, or an abort: the body is never shown (RF-28).
      return GENERIC;
    }
  }
}
