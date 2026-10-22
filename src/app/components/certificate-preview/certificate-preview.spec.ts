import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Certification } from '../../core/interfaces/content';
import { PreviewSource } from '../../core/interfaces/file-preview';
import { CertificateService } from '../../core/services/certificate.service';
import { FilePreview } from '../file-preview/file-preview';
import { CertificatePreview } from './certificate-preview';

const FILE_URL = 'https://api.figueroa-sanchez.com/files/cert-1';

describe('CertificatePreview', () => {
  const certification = (overrides: Partial<Certification> = {}): Certification => ({
    id: 1,
    position: 0,
    name: 'Scrum Máster Profesional',
    issuer: 'Scrum.org',
    issueDate: '2026-04-17',
    expiryDate: null,
    credentialId: null,
    verificationUrl: null,
    fileUrl: FILE_URL,
    ...overrides,
  });
  let fixture: ComponentFixture<CertificatePreview>;
  let load: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.spyOn>;
  let trigger: HTMLButtonElement;

  const render = async (pathname: string, value = certification()): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CertificatePreview],
      providers: [
        { provide: CertificateService, useValue: { load } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CertificatePreview);
    fixture.componentRef.setInput('certification', value);
    await fixture.whenStable();
  };
  /** The source the inner dialog was opened with. */
  const opened = (): PreviewSource => open.mock.lastCall![1] as PreviewSource;

  beforeEach(() => {
    load = vi.fn(() => new Promise(() => undefined));
    open = vi.spyOn(FilePreview.prototype, 'open').mockImplementation(() => undefined);
    trigger = document.createElement('button');
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads nothing until opened, as when prerendered or server-rendered (U-CP-1, RF-03)', async () => {
    await render('/');
    expect(load).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-file-preview dialog')).toBeTruthy();
  });

  it('opens the dialog with the trigger and loads the certification file (U-CP-2, RF-04, RF-05)', async () => {
    await render('/');
    fixture.componentInstance.open(trigger);

    expect(open).toHaveBeenCalledOnce();
    expect(open.mock.lastCall![0]).toBe(trigger);
    const signal = new AbortController().signal;
    void opened().load(signal);
    expect(load).toHaveBeenCalledWith(FILE_URL, signal);
    expect(opened().title).toBe('Scrum Máster Profesional');
    expect(opened().texts.loading).toBe('Loading certificate...');
    expect(opened().renderFailure).toBe('unsupported');
  });

  it('marks a certification in another language than the page (U-CP-3, RF-07)', async () => {
    await render('/es', certification({ lang: 'en' }));
    fixture.componentInstance.open(trigger);
    expect(opened().lang).toBe('en');
    expect(opened().texts.loading).toBe('Cargando el certificado...');
  });

  it('does not mark a certification already in the page language (U-CP-3, RF-07)', async () => {
    await render('/es', certification({ lang: 'es' }));
    fixture.componentInstance.open(trigger);
    expect(opened().lang).toBeNull();
  });

  it.each(['/', '/es'])(
    'names the download after the certification on %s (U-CP-4, RF-18)',
    async (pathname) => {
      await render(pathname);
      fixture.componentInstance.open(trigger);
      const data = new Uint8Array([1]);
      expect(opened().fileName({ kind: 'pdf', mime: 'application/pdf', data })).toBe(
        'scrum-master-profesional.pdf',
      );
      expect(opened().fileName({ kind: 'image', mime: 'image/png', data })).toBe(
        'scrum-master-profesional.png',
      );
    },
  );
});
