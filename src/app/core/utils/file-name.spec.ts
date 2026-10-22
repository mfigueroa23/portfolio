import { certificateFileName } from './file-name';

describe('certificateFileName', () => {
  it('names the file after the certificate in kebab-case (U-FN-1, Spec 008 RF-18)', () => {
    expect(certificateFileName('AWS Certified Cloud Practitioner', 'application/pdf')).toBe(
      'aws-certified-cloud-practitioner.pdf',
    );
  });

  it('drops accents and symbols (U-FN-2, RF-18)', () => {
    expect(certificateFileName('Certificación — Ñandú & Co.', 'image/jpeg')).toBe(
      'certificacion-nandu-co.jpg',
    );
    expect(certificateFileName('  ITIL® 4: Foundation  ', 'application/pdf')).toBe(
      'itil-4-foundation.pdf',
    );
  });

  it.each([
    ['image/png', 'png'],
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
    ['image/svg+xml', 'svg'],
  ])('gives %s the .%s extension (U-FN-3, RF-18)', (mime, extension) => {
    expect(certificateFileName('Scrum Master', mime)).toBe(`scrum-master.${extension}`);
  });

  it('falls back to "certificate" when no letter or digit is left (U-FN-4, plan D8)', () => {
    expect(certificateFileName('日本語 — ★', 'image/png')).toBe('certificate.png');
  });
});
