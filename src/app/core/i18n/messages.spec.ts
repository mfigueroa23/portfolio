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
