import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../config/api';
import { ContactMessage } from '../interfaces/contact';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  const payload: ContactMessage = { name: 'Ada', email: 'ada@example.com', message: 'Hello' };
  let service: ContactService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the message to the API and resolves with its message', async () => {
    const result = service.send(payload);
    const req = http.expectOne(`${API_URL}/contact?lang=en`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: "Message sent successfully! I'll get back to you soon." });
    await expect(result).resolves.toBe("Message sent successfully! I'll get back to you soon.");
  });

  it.each([
    [400, 'Bad Request', 'Please fill in all the fields with valid values.'],
    [429, 'Too Many Requests', 'Too many messages. Please try again later.'],
    [502, 'Bad Gateway', 'Failed to send the message. Please try again later.'],
  ])('rejects with the API error text on %i', async (status, statusText, error) => {
    const result = service.send(payload);
    http.expectOne(`${API_URL}/contact?lang=en`).flush({ error }, { status, statusText });
    await expect(result).rejects.toThrow(error);
  });

  it('rejects with a generic message when the API cannot be reached', async () => {
    const result = service.send(payload);
    http.expectOne(`${API_URL}/contact?lang=en`).error(new ProgressEvent('error'), { status: 0 });
    await expect(result).rejects.toThrow('Failed to send message. Please try again later.');
  });

  it('rejects with a generic message when the error body has no error text', async () => {
    const result = service.send(payload);
    http
      .expectOne(`${API_URL}/contact?lang=en`)
      .flush('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' });
    await expect(result).rejects.toThrow('Failed to send message. Please try again later.');
  });
});

describe('ContactService on Spanish pages', () => {
  it('tells the API the page language and fails in Spanish (RF-177, RF-132)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlatformLocation, useValue: { pathname: '/es' } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const result = TestBed.inject(ContactService).send({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hola',
    });
    http.expectOne(`${API_URL}/contact?lang=es`).error(new ProgressEvent('error'), { status: 0 });
    await expect(result).rejects.toThrow('No se pudo enviar el mensaje. Inténtalo más tarde.');
    http.verify();
  });
});
