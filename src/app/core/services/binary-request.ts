import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, fromEvent, takeUntil, timeout, TimeoutError } from 'rxjs';

/** How long a file may take before the request is aborted (Spec 006 RF-30, Spec 008 RF-31). */
export const FILE_TIMEOUT_MS = 30_000;

/** Why a file request failed: 404, no answer in time, or anything else. */
export type BinaryFailure = 'not-found' | 'generic' | 'timeout';

/** Outcome of one file request; it never throws (plan 008 D3). */
export type BinaryResult =
  { ok: true; body: ArrayBuffer; headers: HttpHeaders } | { ok: false; reason: BinaryFailure };

const GENERIC: BinaryResult = { ok: false, reason: 'generic' };

/**
 * `GET url` as bytes, shared by the resume and certificate services (plan 008 D3). Aborting
 * `signal` cancels the request and resolves with a generic failure that a closed preview drops.
 */
export async function getBinary(
  http: HttpClient,
  url: string,
  options: { params?: Record<string, string> },
  signal: AbortSignal,
): Promise<BinaryResult> {
  if (signal.aborted) return GENERIC;
  try {
    const response = await firstValueFrom(
      http
        .get(url, { params: options.params, responseType: 'arraybuffer', observe: 'response' })
        .pipe(timeout(FILE_TIMEOUT_MS), takeUntil(fromEvent(signal, 'abort'))),
    );
    return { ok: true, body: response.body ?? new ArrayBuffer(0), headers: response.headers };
  } catch (error) {
    if (error instanceof TimeoutError) return { ok: false, reason: 'timeout' };
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return { ok: false, reason: 'not-found' };
    }
    // Any other status, a network or CORS failure, or an abort: the body is never shown.
    return GENERIC;
  }
}
