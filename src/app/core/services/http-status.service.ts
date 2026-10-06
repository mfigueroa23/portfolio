import { inject, Injectable, RESPONSE_INIT } from '@angular/core';

/** Sets the HTTP status of a server-rendered page; a no-op in the browser. */
@Injectable({ providedIn: 'root' })
export class HttpStatusService {
  // Only provided while rendering on the server.
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  public set(status: number): void {
    if (this.responseInit) this.responseInit.status = status;
  }

  /**
   * Answers a redirect to `location` (RF-175). The engine sends the rendered response with the
   * status and headers of `RESPONSE_INIT`, so the browser follows `Location`.
   */
  public redirect(location: string, status: 301 | 302 = 301): void {
    if (!this.responseInit) return;
    const headers = new Headers(this.responseInit.headers);
    headers.set('Location', location);
    this.responseInit.status = status;
    this.responseInit.headers = headers;
  }
}
