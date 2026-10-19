import { MAX_MESSAGE_LENGTH } from '../utils/chat-validation';
import { en } from './messages.en';
import { es } from './messages.es';

/** Every key path of a nested dictionary block, e.g. `errors.timeout`. */
function keyPaths(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object' && !Array.isArray(child)
      ? keyPaths(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

/** Every string of a block, including list items, to check none is blank. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('assistant texts (Spec 001 RF-32)', () => {
  it('has the same keys in English and Spanish', () => {
    expect(keyPaths(es.assistant)).toEqual(keyPaths(en.assistant));
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('has no blank text in %s', (_, messages) => {
    for (const text of strings(messages.assistant)) expect(text.trim()).not.toBe('');
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('offers two or three suggested questions in %s (RF-08)', (_, messages) => {
    expect(messages.assistant.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(messages.assistant.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('names the length limit in both languages (RF-12)', () => {
    expect(en.assistant.tooLong(MAX_MESSAGE_LENGTH)).toBe('Messages can be up to 2000 characters.');
    expect(es.assistant.tooLong(MAX_MESSAGE_LENGTH)).toBe(
      'Los mensajes pueden tener hasta 2000 caracteres.',
    );
    expect(en.assistant.counter(12, MAX_MESSAGE_LENGTH)).toBe('12 / 2000');
  });

  it('has a text and a label for every failure the chat can show (RF-27, RF-28)', () => {
    for (const messages of [en, es]) {
      expect(Object.keys(messages.assistant.errors).sort()).toEqual([
        'generic',
        'interrupted',
        'timeout',
      ]);
      expect(Object.keys(messages.assistant.errorLabels).sort()).toEqual([
        'api',
        'generic',
        'interrupted',
        'timeout',
      ]);
    }
  });
});

describe('resume preview texts (Spec 006 RF-26)', () => {
  it('has the same keys in English and Spanish (U-M-1)', () => {
    expect(keyPaths(es.resumePreview)).toEqual(keyPaths(en.resumePreview));
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('has no blank text in %s (U-M-2, RF-01)', (_, messages) => {
    for (const text of strings(messages.resumePreview)) expect(text.trim()).not.toBe('');
    expect(messages.hero.viewResume.trim()).not.toBe('');
    expect(messages.resumePreview.page(1, 3).trim()).not.toBe('');
  });

  it('labels the hero button "View Resume" and "Ver CV" (RF-01)', () => {
    expect(en.hero.viewResume).toBe('View Resume');
    expect(es.hero.viewResume).toBe('Ver CV');
  });

  it('names the downloaded PDF per language (U-M-3, RF-16)', () => {
    expect(en.resumePreview.fileName).toBe('Marco-Figueroa-Resume.pdf');
    expect(es.resumePreview.fileName).toBe('Marco-Figueroa-CV.pdf');
  });

  it('numbers the pages with the total (RF-11)', () => {
    expect(en.resumePreview.page(2, 3)).toBe('Page 2 of 3');
    expect(es.resumePreview.page(2, 3)).toBe('Página 2 de 3');
  });
});

describe('home certifications and blog texts (Spec 007 RF-21, RF-22)', () => {
  it('has the same keys in English and Spanish (U-MS-1)', () => {
    expect(keyPaths(es.certifications)).toEqual(keyPaths(en.certifications));
    expect(keyPaths(es.blog)).toEqual(keyPaths(en.blog));
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('has no blank text in %s (U-MS-1)', (_, messages) => {
    for (const text of strings([messages.certifications, messages.blog])) {
      expect(text.trim()).not.toBe('');
    }
    expect(messages.nav.certifications.trim()).not.toBe('');
  });

  it('names the menu link and the "see all" links in both languages', () => {
    expect(en.nav.certifications).toBe('Certifications');
    expect(es.nav.certifications).toBe('Certificaciones');
    expect(en.certifications.viewMore).toBe('See all certifications');
    expect(es.certifications.viewMore).toBe('Ver todas las certificaciones');
    expect(en.blog.viewMore).toBe('Read all posts');
    expect(es.blog.viewMore).toBe('Ver todos los artículos');
  });
});
