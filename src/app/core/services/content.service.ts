import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  Injector,
  Signal,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { API_URL } from '../config/api';
import {
  Certification,
  ContentCollection,
  Experience,
  PostDetail,
  PostPage,
  Project,
  ProjectDetail,
} from '../interfaces/content';

// A slow API must not stall the prerender or a server render; the page then shows its
// empty state (home) or answers 503 (content pages).
const LOAD_TIMEOUT_MS = 5000;

/** Why a content page could not be loaded: missing (404) or API unreachable (503). */
export type ApiError = 'notFound' | 'unavailable';

/** Content of a server-rendered page. */
export interface ContentResource<T> {
  /** `undefined` while loading or after an error. */
  readonly value: Signal<T | undefined>;
  readonly error: Signal<ApiError | null>;
  readonly isLoading: Signal<boolean>;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  /**
   * Returns the items of a content collection as a signal, with optional query parameters
   * (e.g. `{ limit: 4 }`).
   *
   * The first GET runs during prerender and its response is embedded in the HTML by the
   * HTTP transfer cache, so hydration reuses it without a flash. Once rendered in the
   * browser, a second GET bypasses that cache to pick up content edited after the release.
   */
  public collection<T>(name: ContentCollection, params?: Record<string, number>): Signal<T[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).map(([key, value]) => [key, String(value)]),
    ).toString();
    const url = `${API_URL}/content/${name}${query ? `?${query}` : ''}`;
    const items = signal<T[]>([]);

    this.http
      .get<T[]>(url)
      .pipe(
        timeout(LOAD_TIMEOUT_MS),
        catchError(() => of<T[]>([])),
      )
      .subscribe((value) => items.set(value));

    // afterNextRender never runs on the server, so the refetch is browser-only.
    afterNextRender(
      () => {
        this.http.get<T[]>(url, { transferCache: false }).subscribe({
          next: (fresh) => {
            // Avoid a new emission (and re-render) when the content did not change.
            if (JSON.stringify(fresh) !== JSON.stringify(items())) items.set(fresh);
          },
          // Keep the prerendered content silently if the API is unreachable.
          error: () => undefined,
        });
      },
      { injector: this.injector },
    );

    return items.asReadonly();
  }

  /** Every published project, newest first (RF-63). */
  public projects(): ContentResource<Project[]> {
    return this.resource<Project[]>(() => `${API_URL}/content/projects`);
  }

  /** A published project with its rendered body; drafts and unknown slugs are `notFound`. */
  public project(slug: () => string): ContentResource<ProjectDetail> {
    return this.resource<ProjectDetail>(
      () => `${API_URL}/content/projects/${encodeURIComponent(slug())}`,
    );
  }

  /** Every experience entry, current first and then by start date (RF-141). */
  public experiences(): ContentResource<Experience[]> {
    return this.resource<Experience[]>(() => `${API_URL}/content/experiences`);
  }

  public certifications(): ContentResource<Certification[]> {
    return this.resource<Certification[]>(() => `${API_URL}/content/certifications`);
  }

  /**
   * A page of published posts, optionally of one tag (its URL key). A `null` page (an
   * invalid page number in the URL) sends no request.
   */
  public postPage(page: () => number | null, tag: () => string | null): ContentResource<PostPage> {
    return this.resource<PostPage>(() => {
      const number = page();
      if (number === null) return undefined;
      const key = tag();
      const query = key ? `page=${number}&tag=${encodeURIComponent(key)}` : `page=${number}`;
      return `${API_URL}/content/posts?${query}`;
    });
  }

  public post(slug: () => string): ContentResource<PostDetail> {
    return this.resource<PostDetail>(
      () => `${API_URL}/content/posts/${encodeURIComponent(slug())}`,
    );
  }

  /**
   * Loads content for a server-rendered page. Must run in an injection context (a component
   * field) so the request is tied to that page.
   *
   * The server waits for the response and the HTTP transfer cache embeds it in the HTML, so
   * hydration reuses it; unlike `collection()`, there is no browser refetch because every
   * request to these routes is already rendered with fresh content (RF-120, RF-129).
   */
  private resource<T>(url: () => string | undefined): ContentResource<T> {
    const ref = httpResource<T>(() => {
      const target = url();
      return target === undefined ? undefined : { url: target, timeout: LOAD_TIMEOUT_MS };
    });
    const error = computed<ApiError | null>(() => {
      const failure = ref.error();
      if (!failure) return null;
      return failure instanceof HttpErrorResponse && failure.status === 404
        ? 'notFound'
        : 'unavailable';
    });
    return {
      value: computed(() => (ref.hasValue() ? ref.value() : undefined)),
      error,
      isLoading: ref.isLoading,
    };
  }
}
