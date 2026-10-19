import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../config/api';
import { ResumeResult } from '../interfaces/resume';
import { RESUME_TIMEOUT_MS, ResumeService } from './resume.service';

const GENERIC: ResumeResult = { ok: false, reason: 'generic' };

/** The first bytes of a PDF file. */
const pdf = (): ArrayBuffer => new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer;

/** An error body as the API sends it; built here, since jsdom does not take Node.js buffers. */
const json = (text: string): ArrayBuffer =>
  Uint8Array.from(text, (char) => char.charCodeAt(0)).buffer;

describe('ResumeService', () => {
  let service: ResumeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResumeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const resumeRequest = (lang: string) =>
    http.expectOne((req) => req.url === `${API_URL}/resume` && req.params.get('lang') === lang);

  it('requests the resume in the language as bytes and resolves with them (U-RS-1, RF-04, RF-13)', async () => {
    const result = service.load('es', new AbortController().signal);
    const req = resumeRequest('es');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('arraybuffer');
    // The API may answer a Spanish request with the English PDF; it is used as is.
    req.flush(pdf());

    await expect(result).resolves.toEqual({ ok: true, data: new Uint8Array(pdf()) });
  });

  it('resolves with not-found on a 404 (U-RS-2, RF-27)', async () => {
    const result = service.load('en', new AbortController().signal);
    resumeRequest('en').flush(json('{"error":"Not found."}'), {
      status: 404,
      statusText: 'Not Found',
    });
    await expect(result).resolves.toEqual({ ok: false, reason: 'not-found' });
  });

  it.each([400, 500, 503])(
    'resolves with a generic failure on a %i, without the body (U-RS-3, RF-28)',
    async (status) => {
      const result = service.load('en', new AbortController().signal);
      resumeRequest('en').flush(json('{"error":"Boom"}'), {
        status,
        statusText: 'Error',
      });
      await expect(result).resolves.toEqual(GENERIC);
    },
  );

  it('resolves with a generic failure when the API cannot be reached (U-RS-4, RF-28)', async () => {
    const result = service.load('en', new AbortController().signal);
    resumeRequest('en').error(new ProgressEvent('error'), { status: 0 });
    await expect(result).resolves.toEqual(GENERIC);
  });

  it('aborts the request and resolves with a timeout after 30 seconds (U-RS-5, RF-30)', async () => {
    vi.useFakeTimers();
    expect(RESUME_TIMEOUT_MS).toBe(30_000);
    const result = service.load('en', new AbortController().signal);
    const req = resumeRequest('en');

    vi.advanceTimersByTime(RESUME_TIMEOUT_MS - 1);
    expect(req.cancelled).toBe(false);
    vi.advanceTimersByTime(1);

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('answers a second load in the same language from memory (U-RS-6, RF-05, plan D6)', async () => {
    const first = service.load('es', new AbortController().signal);
    resumeRequest('es').flush(pdf());
    await first;

    await expect(service.load('es', new AbortController().signal)).resolves.toEqual({
      ok: true,
      data: new Uint8Array(pdf()),
    });
    http.expectNone(`${API_URL}/resume?lang=es`);
  });

  it('cancels the request when the signal aborts, and keeps nothing (U-RS-7, RF-20)', async () => {
    const controller = new AbortController();
    const result = service.load('en', controller.signal);
    const req = resumeRequest('en');

    controller.abort();

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual(GENERIC);
    const again = service.load('en', new AbortController().signal);
    resumeRequest('en').flush(pdf());
    await expect(again).resolves.toMatchObject({ ok: true });
  });

  it('sends no request when the signal is already aborted (RF-20)', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(service.load('en', controller.signal)).resolves.toEqual(GENERIC);
    http.expectNone(() => true);
  });

  it('sends a new request after a failure (U-RS-8, RF-31)', async () => {
    const failed = service.load('en', new AbortController().signal);
    resumeRequest('en').flush(new ArrayBuffer(0), { status: 500, statusText: 'Error' });
    await expect(failed).resolves.toEqual(GENERIC);

    const retried = service.load('en', new AbortController().signal);
    resumeRequest('en').flush(pdf());
    await expect(retried).resolves.toMatchObject({ ok: true });
  });

  it('keeps the bytes per language (U-RS-9)', async () => {
    const spanish = service.load('es', new AbortController().signal);
    resumeRequest('es').flush(pdf());
    await spanish;

    const english = service.load('en', new AbortController().signal);
    resumeRequest('en').flush(pdf());
    await expect(english).resolves.toMatchObject({ ok: true });
  });
});
