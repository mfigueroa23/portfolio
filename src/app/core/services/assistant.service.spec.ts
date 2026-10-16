import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AGENT_URL } from '../config/agent';
import { AgentResult } from '../interfaces/assistant';
import { AssistantService, REPLY_TIMEOUT_MS } from './assistant.service';

const CHAT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const GENERIC: AgentResult = { ok: false, reason: 'generic' };

describe('AssistantService', () => {
  let service: AssistantService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssistantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const chatRequest = () => http.expectOne(`${AGENT_URL}/chat`);

  it('posts the chat id and message to the agent and resolves with its reply', async () => {
    const result = service.send(CHAT_ID, 'What does Marco work on?');
    const req = chatRequest();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ chat_id: CHAT_ID, mensaje: 'What does Marco work on?' });
    req.flush({ respuesta: 'Marco builds **AI** solutions.' });
    await expect(result).resolves.toEqual({ ok: true, text: 'Marco builds **AI** solutions.' });
  });

  it.each([500, 503])(
    'resolves with the agent text when it answers %i with one',
    async (status) => {
      const result = service.send(CHAT_ID, 'Hi');
      chatRequest().flush(
        { respuesta: 'The assistant is unavailable right now.' },
        { status, statusText: 'Error' },
      );
      await expect(result).resolves.toEqual({
        ok: false,
        reason: 'api',
        text: 'The assistant is unavailable right now.',
      });
    },
  );

  it.each([
    ['a 503 with an empty respuesta', { respuesta: '  ' }, 503],
    ['a 500 with an HTML body', '<html>Bad Gateway</html>', 500],
    [
      'a 422 validation error',
      { detail: [{ msg: 'String should have at most 2000 characters' }] },
      422,
    ],
    ['a 404 with a respuesta', { respuesta: 'Not here' }, 404],
    ['a 502 from the proxy', { respuesta: 'Bad gateway' }, 502],
  ])('resolves with a generic failure on %s', async (_, body, status) => {
    const result = service.send(CHAT_ID, 'Hi');
    chatRequest().flush(body, { status, statusText: 'Error' });
    await expect(result).resolves.toEqual(GENERIC);
  });

  it('resolves with a generic failure when the agent cannot be reached (network or CORS)', async () => {
    const result = service.send(CHAT_ID, 'Hi');
    chatRequest().error(new ProgressEvent('error'), { status: 0 });
    await expect(result).resolves.toEqual(GENERIC);
  });

  it.each([
    ['without respuesta', {}],
    ['with a non-string respuesta', { respuesta: 42 }],
    ['with an empty respuesta', { respuesta: '' }],
    ['with a null body', null],
  ])('resolves with a generic failure on a 200 %s', async (_, body) => {
    const result = service.send(CHAT_ID, 'Hi');
    chatRequest().flush(body);
    await expect(result).resolves.toEqual(GENERIC);
  });

  it('aborts the request and resolves with a timeout after 30 seconds', async () => {
    vi.useFakeTimers();
    expect(REPLY_TIMEOUT_MS).toBe(30_000);
    const result = service.send(CHAT_ID, 'Hi');
    const req = chatRequest();

    vi.advanceTimersByTime(REPLY_TIMEOUT_MS - 1);
    expect(req.cancelled).toBe(false);
    vi.advanceTimersByTime(1);

    expect(req.cancelled).toBe(true);
    await expect(result).resolves.toEqual({ ok: false, reason: 'timeout' });
  });
});
