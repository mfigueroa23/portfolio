/** Base pace of the word-by-word reveal (Spec 001 RF-14). */
export const MS_PER_WORD = 35;

/** No reply takes longer than this to reveal; long ones add several words per tick (plan D1). */
export const MAX_REVEAL_MS = 4000;

const MAX_TICKS = Math.floor(MAX_REVEAL_MS / MS_PER_WORD);

// A word with its trailing whitespace; the first one also takes any leading whitespace.
const TOKEN = /\s*\S+\s*/g;

/**
 * The words of `text` in order, each with the whitespace after it, so every prefix keeps the
 * line breaks and Markdown layout of the source and joining them all gives `text` back.
 */
export function revealTokens(text: string): string[] {
  return text.match(TOKEN) ?? (text ? [text] : []);
}

/** Words to add on each tick so that `total` words take at most `MAX_REVEAL_MS`. */
export function wordsPerTick(total: number): number {
  return Math.max(1, Math.ceil(total / MAX_TICKS));
}
