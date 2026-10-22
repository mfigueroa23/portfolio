import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BinaryResult, FILE_TIMEOUT_MS, getBinary } from './binary-request';

const URL = 'https://api.example.com/files/1';
const GENERIC: BinaryResult = { ok: false, reason: 'generic' };

/** An error body as the API sends it; built here, since jsdom does not take Node.js buffers. */
const json = (text: string): ArrayBuffer =>
  Uint8Array.from(text, (char) => char.charCodeAt(0)).buffer;

describe('getBinary', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const load = (signal = new AbortController().signal, params?: Record<string, string>) =>
    getBinary(client, URL, { params }, signal);

  it('resolves with not-found on a 404 (U-BR-1, Spec 008 RF-29)', async () => {
    const result = load();
    http.expectOne(URL).flush(json('{"error":"Not found."}'), {
      status: 404,
      statusText: 'Not Found',
    });
    await expect(result).resolves.toEqual({ ok: false, reason: 'not-found' });
  });

  it.each([400, 500, 503])(
    'resolves with a generic failure on a %i, without the body (U-BR-2, RF-30)',
    async (status) => {
      const result = load();
      http.expectOne(URL).flush(json('{"error":"Boom"}'), { status, statusText: 'Error' });
      await expect(result).resolves.toEqual(GENERIC);
    },
  );

  it('resolves with a generic failure when the API cannot be reached (U-BR-2, RF-30)', async () => {
    const result = load();
    http.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });
    await expect(result).resolves.toEqual(GENERIC);
  });

  it('aborts the request and resolves with a timeout after 30 seconds (U-BR-3, RF-31)', async () => {
    vi.useFakeTimers();
    expect(FILE_TIMEOUT_MS).toBe(30_000);
    const result = load();
    const req = http.expectOne(URL);

    vi.advanceTimersByTime(FILE_TIMEOUT_MS - 1);
    expect(req.cancelled).toBe(false);
    vi.advanceTimersByTime(1);

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('cancels the request when the signal aborts (U-BR-4, RF-22)', async () => {
    const controller = new AbortController();
    const result = load(controller.signal);
    const req = http.expectOne(URL);

    controller.abort();

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual(GENERIC);
  });

  it('sends no request when the signal is already aborted (RF-22)', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(load(controller.signal)).resolves.toEqual(GENERIC);
    http.expectNone(() => true);
  });

  it('resolves a 200 with the body and the response headers, sending the params (U-BR-5)', async () => {
    const body = new Uint8Array([1, 2, 3]).buffer;
    const result = load(new AbortController().signal, { lang: 'es' });
    const req = http.expectOne((request) => request.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('arraybuffer');
    expect(req.request.params.get('lang')).toBe('es');
    req.flush(body, { headers: { 'Content-Type': 'image/png' } });

    const loaded = await result;
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(new Uint8Array(loaded.body)).toEqual(new Uint8Array([1, 2, 3]));
    expect(loaded.headers.get('Content-Type')).toBe('image/png');
  });
});
