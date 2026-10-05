import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpStatusService } from './http-status.service';

describe('HttpStatusService', () => {
  it('writes the status to the server response', () => {
    const init: ResponseInit = { status: 200 };
    TestBed.configureTestingModule({ providers: [{ provide: RESPONSE_INIT, useValue: init }] });
    TestBed.inject(HttpStatusService).set(404);
    expect(init.status).toBe(404);
  });

  it('does nothing in the browser, where there is no response', () => {
    TestBed.configureTestingModule({});
    expect(() => TestBed.inject(HttpStatusService).set(503)).not.toThrow();
  });
});
