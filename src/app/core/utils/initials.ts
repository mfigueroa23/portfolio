/**
 * Initials of a name (RF-92): the first character of the first and of the last space-separated
 * word, uppercased. Code points, not UTF-16 units, so emoji and accented letters stay whole.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = (word: string): string => Array.from(word)[0].toLocaleUpperCase();
  return words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1]);
}
