import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../config/api';
import { ProjectDetail, Technology } from '../interfaces/content';
import { ContentService } from './content.service';

describe('ContentService', () => {
  const url = `${API_URL}/content/technologies`;
  const initial: Technology[] = [
    { id: 1, position: 0, name: 'Angular' },
    { id: 2, position: 1, name: 'NestJS' },
  ];
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  // The initial load is the request that is not the browser refetch.
  const initialRequest = () =>
    http.expectOne((req) => req.url === url && req.transferCache !== false);
  const refetchRequest = () =>
    http.expectOne((req) => req.url === url && req.transferCache === false);

  describe('initial load', () => {
    it('starts empty and fills the signal with the API items', () => {
      const items = service.collection<Technology>('technologies');
      expect(items()).toEqual([]);
      const req = initialRequest();
      expect(req.request.method).toBe('GET');
      req.flush(initial);
      expect(items()).toEqual(initial);
    });

    it('falls back to an empty list when the API fails', () => {
      const items = service.collection<Technology>('technologies');
      initialRequest().flush(
        { error: 'Internal server error.' },
        { status: 500, statusText: 'Error' },
      );
      expect(items()).toEqual([]);
    });

    it('falls back to an empty list when the API does not answer within 5 seconds', () => {
      vi.useFakeTimers();
      const items = service.collection<Technology>('technologies');
      const req = initialRequest();
      vi.advanceTimersByTime(5000);
      expect(req.cancelled).toBe(true);
      expect(items()).toEqual([]);
      // Advancing the clock also lets the zoneless scheduler render, which starts the refetch.
      http.match((r) => r.transferCache === false).forEach((r) => r.flush([]));
    });
  });

  describe('browser refetch', () => {
    it('requests the content again after the first render, skipping the transfer cache', () => {
      service.collection<Technology>('technologies');
      initialRequest().flush(initial);
      TestBed.tick();
      refetchRequest().flush(initial);
    });

    it('replaces the items when the API returns different content', () => {
      const items = service.collection<Technology>('technologies');
      initialRequest().flush(initial);
      TestBed.tick();
      const updated = [...initial, { id: 3, position: 2, name: 'Docker' }];
      refetchRequest().flush(updated);
      expect(items()).toEqual(updated);
    });

    it('keeps the same value when the API returns the same content', () => {
      const items = service.collection<Technology>('technologies');
      initialRequest().flush(initial);
      const before = items();
      TestBed.tick();
      refetchRequest().flush(structuredClone(initial));
      expect(items()).toBe(before);
    });

    it('adds the query parameters to both requests', () => {
      service.collection<Technology>('projects', { limit: 4 });
      const limited = `${API_URL}/content/projects?limit=4`;
      http
        .expectOne((req) => req.urlWithParams === limited && req.transferCache !== false)
        .flush([]);
      TestBed.tick();
      http
        .expectOne((req) => req.urlWithParams === limited && req.transferCache === false)
        .flush([]);
    });

    it('keeps the previous items when the refetch fails', () => {
      const items = service.collection<Technology>('technologies');
      initialRequest().flush(initial);
      TestBed.tick();
      refetchRequest().error(new ProgressEvent('error'), { status: 0 });
      expect(items()).toEqual(initial);
    });
  });
});

describe('ContentService content pages', () => {
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const create = <T>(factory: () => T): T => TestBed.runInInjectionContext(factory);
  // Resource state updates after the response is processed.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  const project: ProjectDetail = {
    id: 1,
    slug: 'portfolio',
    title: 'Portfolio',
    description: 'This site.',
    image: 'https://api.example.com/files/1',
    tags: ['Angular'],
    link: null,
    github: 'https://example.com/repo',
    publishedAt: '2026-10-01T12:00:00.000Z',
    body: '## Intro',
    bodyHtml: '<h2 id="intro">Intro</h2>',
  };

  it('loads every published project', async () => {
    const projects = create(() => service.projects());
    TestBed.tick();
    http.expectOne(`${API_URL}/content/projects`).flush([project]);
    await settle();
    expect(projects.value()).toEqual([project]);
    expect(projects.error()).toBeNull();
  });

  it('loads one project by its slug', async () => {
    const detail = create(() => service.project(() => 'portfolio'));
    TestBed.tick();
    http.expectOne(`${API_URL}/content/projects/portfolio`).flush(project);
    await settle();
    expect(detail.value()).toEqual(project);
  });

  it('maps a 404 to notFound', async () => {
    const detail = create(() => service.project(() => 'missing'));
    TestBed.tick();
    http
      .expectOne(`${API_URL}/content/projects/missing`)
      .flush({ error: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(detail.error()).toBe('notFound');
    expect(detail.value()).toBeUndefined();
  });

  it('maps a server error to unavailable', async () => {
    const detail = create(() => service.project(() => 'portfolio'));
    TestBed.tick();
    http
      .expectOne(`${API_URL}/content/projects/portfolio`)
      .flush({ error: 'Internal server error.' }, { status: 500, statusText: 'Error' });
    await settle();
    expect(detail.error()).toBe('unavailable');
  });

  it('maps a network failure to unavailable', async () => {
    const experiences = create(() => service.experiences());
    TestBed.tick();
    http
      .expectOne(`${API_URL}/content/experiences`)
      .error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(experiences.error()).toBe('unavailable');
  });

  it('loads the certifications', async () => {
    const certifications = create(() => service.certifications());
    TestBed.tick();
    http.expectOne(`${API_URL}/content/certifications`).flush([]);
    await settle();
    expect(certifications.value()).toEqual([]);
  });

  it('loads a page of posts, filtered by tag when given', async () => {
    const all = create(() =>
      service.postPage(
        () => 2,
        () => null,
      ),
    );
    const tagged = create(() =>
      service.postPage(
        () => 1,
        () => 'next-js',
      ),
    );
    TestBed.tick();
    http.expectOne(`${API_URL}/content/posts?page=2`).flush({
      items: [],
      page: 2,
      totalPages: 2,
      total: 11,
      tag: null,
    });
    http.expectOne(`${API_URL}/content/posts?page=1&tag=next-js`).flush({
      items: [],
      page: 1,
      totalPages: 1,
      total: 1,
      tag: 'Next.js',
    });
    await settle();
    expect(all.value()?.total).toBe(11);
    expect(tagged.value()?.tag).toBe('Next.js');
  });

  it('does not ask for a page of posts when the page number is invalid', async () => {
    const invalid = create(() =>
      service.postPage(
        () => null,
        () => null,
      ),
    );
    TestBed.tick();
    http.expectNone((req) => req.url.startsWith(`${API_URL}/content/posts`));
    await settle();
    expect(invalid.value()).toBeUndefined();
    expect(invalid.error()).toBeNull();
  });

  it('loads one post by its slug, encoding it', async () => {
    const post = create(() => service.post(() => 'a b'));
    TestBed.tick();
    http.expectOne(`${API_URL}/content/posts/a%20b`).flush({ slug: 'a b' });
    await settle();
    expect(post.value()?.slug).toBe('a b');
  });

  it('does not request the content again in the browser after rendering', async () => {
    create(() => service.projects());
    TestBed.tick();
    http.expectOne(`${API_URL}/content/projects`).flush([project]);
    TestBed.tick();
    http.expectNone((req) => req.transferCache === false);
  });
});
