import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../interfaces/contact';

// Only the API's own `{ error }` body is shown; network failures (status 0) and
// non-JSON bodies from proxies fall back to `fallback`, the generic text (RF-27).
export function apiErrorText(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status !== 0) {
    const body = error.error as Partial<ApiError> | null;
    if (typeof body?.error === 'string' && body.error) return body.error;
  }
  return fallback;
}
