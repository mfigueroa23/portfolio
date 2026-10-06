import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../config/api';
import { TestimonialSubmission } from '../interfaces/testimonial';
import { TestimonialService } from './testimonial.service';

describe('TestimonialService', () => {
  const payload: TestimonialSubmission = {
    name: 'Ada',
    role: 'CTO',
    email: 'ada@example.com',
    testimonial: 'Great to work with.',
    website: '',
  };
  const url = `${API_URL}/testimonials?lang=en`;
  let service: TestimonialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TestimonialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the testimonial to the API and resolves with its message', async () => {
    const result = service.submit(payload);
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'Thanks! Your testimonial will appear once it has been reviewed.' });
    await expect(result).resolves.toBe(
      'Thanks! Your testimonial will appear once it has been reviewed.',
    );
  });

  it.each([
    [400, 'Bad Request', 'Please fill in all the fields with valid values.'],
    [429, 'Too Many Requests', 'Too many submissions. Please try again later.'],
  ])('rejects with the API error text on %i (RF-26)', async (status, statusText, error) => {
    const result = service.submit(payload);
    http.expectOne(url).flush({ error }, { status, statusText });
    await expect(result).rejects.toThrow(error);
  });

  it('rejects with a generic message when the API cannot be reached (RF-27)', async () => {
    const result = service.submit(payload);
    http.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    await expect(result).rejects.toThrow('Failed to send message. Please try again later.');
  });

  it('rejects with a generic message when the error body has no error text', async () => {
    const result = service.submit(payload);
    http.expectOne(url).flush('<html>Bad Gateway</html>', {
      status: 502,
      statusText: 'Bad Gateway',
    });
    await expect(result).rejects.toThrow('Failed to send message. Please try again later.');
  });
});

describe('TestimonialService on Spanish pages', () => {
  it('tells the API the page language (RF-177)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlatformLocation, useValue: { pathname: '/es' } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const result = TestBed.inject(TestimonialService).submit({
      name: 'Ada',
      role: 'CTO',
      email: 'ada@example.com',
      testimonial: 'Excelente.',
    });
    http
      .expectOne(`${API_URL}/testimonials?lang=es`)
      .flush({ message: '¡Gracias! Tu testimonio aparecerá cuando haya sido revisado.' });
    await expect(result).resolves.toContain('¡Gracias!');
    http.verify();
  });
});
