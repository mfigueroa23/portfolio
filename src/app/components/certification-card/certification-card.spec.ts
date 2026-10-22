import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/config/api';
import { Certification } from '../../core/interfaces/content';
import { CertificatePreview } from '../certificate-preview/certificate-preview';
import { CertificationCard } from './certification-card';

describe('CertificationCard', () => {
  const certification = (overrides: Partial<Certification> = {}): Certification => ({
    id: 1,
    position: 0,
    name: 'Data Analytics',
    issuer: 'Santo Tomas',
    issueDate: '2026-04-17',
    expiryDate: null,
    credentialId: null,
    verificationUrl: null,
    fileUrl: null,
    ...overrides,
  });
  let pathname = '/';

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const render = async (value: Certification): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [CertificationCard],
      providers: [{ provide: PlatformLocation, useValue: { pathname } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CertificationCard);
    fixture.componentRef.setInput('certification', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows name, issuer, the issue date and "No expiry" (U-CC-1)', async () => {
    const element = await render(certification());
    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Data Analytics');
    expect(element.textContent).toContain('Santo Tomas');
    expect(element.textContent).toContain('Apr 17, 2026');
    expect(element.textContent).toContain('No expiry');
    expect(element.textContent).not.toContain('Credential');
  });

  it('shows the expiry date and the credential ID when present (U-CC-1)', async () => {
    const element = await render(
      certification({ expiryDate: '2999-03-31', credentialId: 'ABC-123' }),
    );
    expect(element.textContent).toContain('Mar 31, 2999');
    expect(element.textContent).toContain('Credential');
    expect(element.textContent).toContain('ABC-123');
  });

  it('opens the certificate file and the verification link in new tabs (U-CC-2)', async () => {
    const element = await render(
      certification({
        fileUrl: 'https://api.example.com/files/cert',
        verificationUrl: 'https://verify.example.com/abc',
      }),
    );
    const view = element.querySelector('a[href="https://api.example.com/files/cert"]');
    const verify = element.querySelector('a[href="https://verify.example.com/abc"]');
    expect(view?.textContent).toContain('View certificate');
    expect(verify?.textContent).toContain('Verify');
    for (const link of [view, verify]) {
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('shows no link when the certification has neither URL (U-CC-3)', async () => {
    const element = await render(certification());
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('app-certificate-preview')).toBeNull();
  });

  describe('with a file on the API (Spec 008)', () => {
    const apiFile = `${API_URL}/files/cert-1`;

    it('shows "View certificate" as a button that hosts the preview (U-CC-7, RF-01)', async () => {
      const element = await render(
        certification({ fileUrl: apiFile, verificationUrl: 'https://verify.example.com/abc' }),
      );
      const view = element.querySelector<HTMLButtonElement>('button[data-view-certificate]');
      expect(view?.type).toBe('button');
      expect(view?.textContent).toContain('View certificate');
      expect(view?.hasAttribute('href')).toBe(false);
      expect(element.querySelector(`a[href="${apiFile}"]`)).toBeNull();
      expect(element.querySelector('app-certificate-preview dialog')).toBeTruthy();
      // "Verify" keeps opening in a new tab.
      const verify = element.querySelector('a[href="https://verify.example.com/abc"]');
      expect(verify?.getAttribute('target')).toBe('_blank');
    });

    it('keeps the new-tab link and no preview for a file on another origin (U-CC-8, RF-02)', async () => {
      const element = await render(certification({ fileUrl: 'https://cdn.example.com/cert.pdf' }));
      const view = element.querySelector('a[href="https://cdn.example.com/cert.pdf"]');
      expect(view?.getAttribute('target')).toBe('_blank');
      expect(element.querySelector('button[data-view-certificate]')).toBeNull();
      expect(element.querySelector('app-certificate-preview')).toBeNull();
    });

    it('opens the preview with the button as the trigger (U-CC-9, RF-04, RF-21)', async () => {
      const open = vi
        .spyOn(CertificatePreview.prototype, 'open')
        .mockImplementation(() => undefined);
      const element = await render(certification({ fileUrl: apiFile }));
      const view = element.querySelector<HTMLButtonElement>('button[data-view-certificate]')!;

      view.click();

      expect(open).toHaveBeenCalledExactlyOnceWith(view);
    });
  });

  it('labels a certification that expired before today, not one that expires today (U-CC-4)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
    const expired = await render(certification({ expiryDate: '2026-04-30' }));
    expect(expired.textContent).toContain('Expired');

    TestBed.resetTestingModule();
    const today = await render(certification({ expiryDate: '2026-05-01' }));
    expect(today.textContent).not.toContain('Expired');
    expect(today.textContent).toContain('Expires');
  });

  it('judges the expiry with the date the page is viewed, not a fixed one (U-CC-5, RF-07)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    const later = await render(certification({ expiryDate: '2026-06-01' }));
    expect(later.textContent).toContain('Expired');

    TestBed.resetTestingModule();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
    const earlier = await render(certification({ expiryDate: '2026-06-01' }));
    expect(earlier.textContent).not.toContain('Expired');
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates the labels, formats dates in Spanish and marks English items (U-CC-6)', async () => {
      const element = await render(certification({ lang: 'en' }));
      expect(element.textContent).toContain('Emitida');
      expect(element.textContent).toContain('17 abr 2026');
      expect(element.textContent).toContain('Sin vencimiento');
      expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
    });

    it('does not mark items already in Spanish (U-CC-6)', async () => {
      const element = await render(certification({ lang: 'es' }));
      expect(element.querySelector('article')?.hasAttribute('lang')).toBe(false);
    });
  });
});
