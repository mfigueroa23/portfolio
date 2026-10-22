import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CertificateService } from './certificate.service';

const FILE_URL = 'https://api.figueroa-sanchez.com/files/cert-1';
const OTHER_URL = 'https://api.figueroa-sanchez.com/files/cert-2';

/** A few bytes; the service never looks inside them (plan D4). */
const bytes = (): ArrayBuffer => new Uint8Array([37, 80, 68, 70, 45]).buffer;

describe('CertificateService', () => {
  let service: CertificateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CertificateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const load = (url = FILE_URL, signal = new AbortController().signal) => service.load(url, signal);
  const flushAs = (contentType: string | null, url = FILE_URL) =>
    http
      .expectOne(url)
      .flush(bytes(), { headers: contentType ? { 'Content-Type': contentType } : {} });

  it('requests the file URL as is, with no language parameter, as bytes (U-CS-1, RF-05)', async () => {
    const result = load();
    const req = http.expectOne(FILE_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.responseType).toBe('arraybuffer');
    req.flush(bytes(), { headers: { 'Content-Type': 'application/pdf' } });
    await result;
  });

  it('tells a PDF by its content type (U-CS-2, RF-10)', async () => {
    const result = load();
    flushAs('application/pdf');
    await expect(result).resolves.toEqual({
      ok: true,
      file: { kind: 'pdf', mime: 'application/pdf', data: new Uint8Array(bytes()) },
    });
  });

  it.each(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])(
    'tells a %s image by its content type (U-CS-2, RF-11)',
    async (mime) => {
      const result = load();
      flushAs(`${mime}; charset=utf-8`);
      await expect(result).resolves.toEqual({
        ok: true,
        file: { kind: 'image', mime, data: new Uint8Array(bytes()) },
      });
    },
  );

  it('resolves with not-found on a 404 (U-CS-3, RF-29)', async () => {
    const result = load();
    http.expectOne(FILE_URL).flush(new ArrayBuffer(0), { status: 404, statusText: 'Not Found' });
    await expect(result).resolves.toEqual({ ok: false, reason: 'not-found' });
  });

  it('resolves with a generic failure on a 500 or when the API cannot be reached (U-CS-4, RF-30)', async () => {
    const failed = load();
    http.expectOne(FILE_URL).flush(new ArrayBuffer(0), { status: 500, statusText: 'Error' });
    await expect(failed).resolves.toEqual({ ok: false, reason: 'generic' });

    const offline = load();
    http.expectOne(FILE_URL).error(new ProgressEvent('error'), { status: 0 });
    await expect(offline).resolves.toEqual({ ok: false, reason: 'generic' });
  });

  it('resolves with a timeout after 30 seconds (U-CS-5, RF-31)', async () => {
    vi.useFakeTimers();
    const result = load();
    const req = http.expectOne(FILE_URL);
    vi.advanceTimersByTime(30_000);
    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it.each(['text/html', 'application/octet-stream', 'image/bmp', null])(
    'resolves %s as unsupported and does not keep it (U-CS-6, RF-33)',
    async (contentType) => {
      const result = load();
      flushAs(contentType);
      await expect(result).resolves.toEqual({ ok: false, reason: 'unsupported' });

      const again = load();
      flushAs('application/pdf');
      await expect(again).resolves.toMatchObject({ ok: true });
    },
  );

  it('answers a second load of the same URL from memory (U-CS-7, RF-06, plan D5)', async () => {
    const first = load();
    flushAs('image/png');
    await first;

    await expect(load()).resolves.toMatchObject({ ok: true, file: { kind: 'image' } });
    http.expectNone(FILE_URL);
  });

  it('sends its own request for another URL (U-CS-8)', async () => {
    const first = load();
    flushAs('image/png');
    await first;

    const other = load(OTHER_URL);
    flushAs('application/pdf', OTHER_URL);
    await expect(other).resolves.toMatchObject({ ok: true, file: { kind: 'pdf' } });
  });

  it('cancels the request when the signal aborts, and keeps nothing (U-CS-9, RF-22)', async () => {
    const controller = new AbortController();
    const result = load(FILE_URL, controller.signal);
    const req = http.expectOne(FILE_URL);

    controller.abort();

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual({ ok: false, reason: 'generic' });
    const again = load();
    flushAs('application/pdf');
    await expect(again).resolves.toMatchObject({ ok: true });
  });

  it('sends a new request after a failure (U-CS-10, RF-32)', async () => {
    const failed = load();
    http.expectOne(FILE_URL).flush(new ArrayBuffer(0), { status: 503, statusText: 'Error' });
    await expect(failed).resolves.toEqual({ ok: false, reason: 'generic' });

    const retried = load();
    flushAs('application/pdf');
    await expect(retried).resolves.toMatchObject({ ok: true });
  });
});
