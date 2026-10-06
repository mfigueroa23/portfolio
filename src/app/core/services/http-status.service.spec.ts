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

  it('answers a permanent redirect with its Location (RF-175)', () => {
    const init: ResponseInit = {
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/html' }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: RESPONSE_INIT, useValue: init }] });
    TestBed.inject(HttpStatusService).redirect('/es/blog/hola');

    expect(init.status).toBe(301);
    const headers = init.headers as Headers;
    expect(headers.get('Location')).toBe('/es/blog/hola');
    expect(headers.get('Content-Type')).toBe('text/html');
  });

  it('adds the Location to plain header objects too', () => {
    const init: ResponseInit = { status: 200 };
    TestBed.configureTestingModule({ providers: [{ provide: RESPONSE_INIT, useValue: init }] });
    TestBed.inject(HttpStatusService).redirect('/es/projects/hola', 301);

    expect(new Headers(init.headers).get('Location')).toBe('/es/projects/hola');
  });

  it('does not redirect in the browser', () => {
    TestBed.configureTestingModule({});
    expect(() => TestBed.inject(HttpStatusService).redirect('/es')).not.toThrow();
  });
});
