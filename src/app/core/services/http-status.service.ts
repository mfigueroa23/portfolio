import { inject, Injectable, RESPONSE_INIT } from '@angular/core';

/** Sets the HTTP status of a server-rendered page; a no-op in the browser. */
@Injectable({ providedIn: 'root' })
export class HttpStatusService {
  // Only provided while rendering on the server.
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  public set(status: number): void {
    if (this.responseInit) this.responseInit.status = status;
  }
}
