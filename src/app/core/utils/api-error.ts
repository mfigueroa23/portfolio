import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../interfaces/contact';

/** Shown when the API cannot be reached or answers without its own error text (RF-27). */
export const GENERIC_SEND_ERROR = 'Failed to send message. Please try again later.';

// Only the API's own `{ error }` body is shown; network failures (status 0) and
// non-JSON bodies from proxies fall back to a generic text.
export function apiErrorText(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status !== 0) {
    const body = error.error as Partial<ApiError> | null;
    if (typeof body?.error === 'string' && body.error) return body.error;
  }
  return GENERIC_SEND_ERROR;
}
