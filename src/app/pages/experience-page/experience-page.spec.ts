import { PlatformLocation } from '@angular/common';
import { RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError, ContentService } from '../../core/services/content.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { SeoService } from '../../core/services/seo.service';
import { Certification, Experience } from '../../core/interfaces/content';
import { ExperiencePage } from './experience-page';

describe('ExperiencePage', () => {
  const entries: Experience[] = [
    {
      id: 1,
      period: 'Jan 2026 — Present',
      role: 'Software Developer',
      company: 'Acme',
      description: 'Builds the platform.',
      technologies: ['Angular', 'NestJS'],
      current: true,
      startDate: '2026-01',
      body: '## Highlights',
      bodyHtml: '<h2 id="highlights">Highlights</h2>',
    },
    {
      id: 2,
      period: '2024 — 2025',
      role: 'System Administrator',
      company: 'Globex',
      description: 'Ran the servers.',
      technologies: ['Linux'],
      current: false,
      startDate: '2024-02',
      body: null,
      bodyHtml: null,
    },
  ];
  const certification = (overrides: Partial<Certification>): Certification => ({
    id: 1,
    position: 0,
    name: 'Kubernetes Administrator',
    issuer: 'CNCF',
    issueDate: '2025-03-01',
    expiryDate: null,
    credentialId: null,
    verificationUrl: null,
    fileUrl: null,
    ...overrides,
  });
  let seo: { set: ReturnType<typeof vi.fn> };
  let init: ResponseInit;
  let pathname = '/';

  const resource = <T>(value: T | undefined, error: ApiError | null = null) => ({
    value: signal(value),
    error: signal(error),
    isLoading: signal(false),
  });

  const render = async (
    experienceList: Experience[] | undefined,
    certificationList: Certification[] | undefined = [],
    error: ApiError | null = null,
  ) => {
    seo = { set: vi.fn() };
    init = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [ExperiencePage],
      providers: [
        {
          provide: ContentService,
          useValue: {
            experiences: () => resource(experienceList, error),
            certifications: () => resource(certificationList),
          },
        },
        { provide: SeoService, useValue: seo },
        { provide: MermaidService, useValue: { renderIn: vi.fn() } },
        { provide: RESPONSE_INIT, useValue: init },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ExperiencePage);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  describe('entries', () => {
    it('lists every entry collapsed, with period, role, company and the current badge', async () => {
      const { element } = await render(entries);
      const details = element.querySelectorAll('details');

      expect(details.length).toBe(2);
      details.forEach((entry) => expect(entry.open).toBe(false));
      const summary = details[0].querySelector('summary');
      expect(summary?.textContent).toContain('Jan 2026 — Present');
      expect(summary?.textContent).toContain('Software Developer');
      expect(summary?.textContent).toContain('Acme');
      expect(summary?.textContent).toContain('Current');
      expect(details[1].querySelector('summary')?.textContent).not.toContain('Current');
    });

    it('keeps the expanded content in the HTML: description, technologies and body', async () => {
      const { element } = await render(entries);
      const [first, second] = Array.from(element.querySelectorAll('details'));

      expect(first.textContent).toContain('Builds the platform.');
      expect(first.textContent).toContain('NestJS');
      expect(first.querySelector('app-markdown-body h2#highlights')).not.toBeNull();
      expect(second.textContent).toContain('Ran the servers.');
      expect(second.querySelector('app-markdown-body')).toBeNull();
    });

    it('lets several entries be expanded at the same time', async () => {
      const { fixture, element } = await render(entries);
      const details = Array.from(element.querySelectorAll('details'));
      details.forEach((entry) => entry.querySelector('summary')?.click());
      await fixture.whenStable();

      expect(details.map((entry) => entry.open)).toEqual([true, true]);
    });

    it('shows an empty state when there are no entries', async () => {
      const { element } = await render([]);
      expect(element.querySelector('details')).toBeNull();
      expect(element.textContent).toContain('Experience coming soon');
    });

    it('sets its title and canonical path', async () => {
      await render(entries);
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Experience', path: '/experience' }),
      );
    });

    it('answers 503 when the API is unreachable', async () => {
      const { element } = await render(undefined, [], 'unavailable');
      expect(init.status).toBe(503);
      expect(element.textContent).toContain('Temporarily unavailable');
    });
  });

  describe('certifications', () => {
    const section = (element: HTMLElement) =>
      element.querySelector<HTMLElement>('section[aria-labelledby="certifications"]');

    it('is hidden when there are no certifications', async () => {
      const { element } = await render(entries, []);
      expect(section(element)).toBeNull();
    });

    it('lists them below the entries in ascending position', async () => {
      const { element } = await render(entries, [
        certification({ id: 2, position: 1, name: 'Second' }),
        certification({ id: 1, position: 0, name: 'First' }),
      ]);
      const names = Array.from(section(element)!.querySelectorAll('h3'), (h3) =>
        h3.textContent?.trim(),
      );
      expect(names).toEqual(['First', 'Second']);
      // Below the entries.
      const last = Array.from(element.querySelectorAll('details')).at(-1)!;
      expect(last.compareDocumentPosition(section(element)!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it('shows name, issuer, dates unchanged and the credential ID', async () => {
      const { element } = await render(entries, [
        certification({ expiryDate: '2999-03-31', credentialId: 'ABC-123' }),
      ]);
      const card = section(element)!;
      expect(card.textContent).toContain('Kubernetes Administrator');
      expect(card.textContent).toContain('CNCF');
      expect(card.textContent).toContain('Mar 1, 2025');
      expect(card.textContent).toContain('Mar 31, 2999');
      expect(card.textContent).toContain('ABC-123');
      expect(card.textContent).not.toContain('Expired');
    });

    it('offers the certificate file and the verification link in new tabs', async () => {
      const { element } = await render(entries, [
        certification({
          fileUrl: 'https://api.example.com/files/cert',
          verificationUrl: 'https://verify.example.com/abc',
        }),
      ]);
      const view = section(element)!.querySelector('a[href="https://api.example.com/files/cert"]');
      const verify = section(element)!.querySelector('a[href="https://verify.example.com/abc"]');
      expect(view?.textContent).toContain('View certificate');
      expect(view?.getAttribute('target')).toBe('_blank');
      expect(verify?.textContent).toContain('Verify');
      expect(verify?.getAttribute('target')).toBe('_blank');
      expect(verify?.getAttribute('rel')).toContain('noopener');
    });

    it('hides the links a certification does not have', async () => {
      const { element } = await render(entries, [certification({})]);
      expect(section(element)!.textContent).not.toContain('View certificate');
      expect(section(element)!.textContent).not.toContain('Verify');
    });

    it('labels an expired certification and says when one never expires', async () => {
      const { element } = await render(entries, [
        certification({ id: 1, name: 'Old', expiryDate: '2001-01-31' }),
        certification({ id: 2, position: 1, name: 'Forever', expiryDate: null }),
      ]);
      const [old, forever] = Array.from(section(element)!.querySelectorAll('article'));
      expect(old.textContent).toContain('Expired');
      expect(forever.textContent).not.toContain('Expired');
      expect(forever.textContent).toContain('No expiry');
    });
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es/experience'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and formats dates in Spanish (RF-131, RF-134)', async () => {
      const { element } = await render(
        [{ ...entries[0], lang: 'es' }],
        [certification({ issueDate: '2026-10-05', lang: 'es' })],
      );

      expect(element.querySelector('h1')?.textContent).toContain('La historia');
      expect(element.querySelector('summary')?.textContent).toContain('Actual');
      expect(element.textContent).toContain('Certificaciones');
      expect(element.textContent).toContain('Emitida');
      expect(element.textContent).toContain('5 oct 2026');
      expect(element.textContent).toContain('Sin vencimiento');
      expect(element.querySelector('a[href="/es"]')?.textContent).toContain('Volver al inicio');
    });

    it('marks entries and certifications shown in English (RF-152)', async () => {
      const { element } = await render(
        [{ ...entries[0], lang: 'en' }],
        [certification({ lang: 'en' })],
      );
      expect(element.querySelector('details')?.getAttribute('lang')).toBe('en');
      expect(element.querySelector('h3')?.closest('article')?.getAttribute('lang')).toBe('en');
    });

    it('sets the Spanish title', async () => {
      await render(entries);
      expect(seo.set).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Experiencia', path: '/experience' }),
      );
    });
  });
});
