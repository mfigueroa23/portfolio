import { PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Certification } from '../../core/interfaces/content';
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

  afterEach(() => vi.useRealTimers());

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
