import { MAX_REVEAL_MS, MS_PER_WORD, revealTokens, wordsPerTick } from './word-reveal';

/** How long a reveal of `total` words takes at the computed pace. */
const durationMs = (total: number): number => Math.ceil(total / wordsPerTick(total)) * MS_PER_WORD;

describe('revealTokens', () => {
  it('splits a text into words that keep their trailing whitespace', () => {
    expect(revealTokens('Hi Marco,\nwelcome  back')).toEqual([
      'Hi ',
      'Marco,\n',
      'welcome  ',
      'back',
    ]);
  });

  it('rebuilds the source when joined, including Markdown and leading space', () => {
    const text = '  **Stack:**\n- Angular\n- Node.js\n\n```\npnpm build\n```\n';

    expect(revealTokens(text).join('')).toBe(text);
  });

  it('ends every prefix on a word boundary', () => {
    const text = 'Marco builds AI-powered solutions with FastAPI.';
    const tokens = revealTokens(text);

    for (let n = 1; n < tokens.length; n++) {
      const prefix = tokens.slice(0, n).join('');
      expect(prefix).toMatch(/\s$/);
      expect(text.startsWith(prefix)).toBe(true);
    }
  });

  it('returns no tokens for an empty text', () => {
    expect(revealTokens('')).toEqual([]);
  });
});

describe('wordsPerTick', () => {
  it('reveals one word per tick at the base pace', () => {
    expect(MS_PER_WORD).toBe(35);
    expect(wordsPerTick(1)).toBe(1);
    expect(wordsPerTick(100)).toBe(1);
  });

  it('speeds up long replies so any reveal ends within the cap', () => {
    expect(MAX_REVEAL_MS).toBe(4000);
    for (const total of [114, 115, 457, 500, 2000, 10000]) {
      expect(durationMs(total)).toBeLessThanOrEqual(MAX_REVEAL_MS);
    }
    expect(wordsPerTick(2000)).toBeGreaterThan(1);
  });
});
