/** URL key of a tag: lowercased, spaces replaced by hyphens (RF-96). */
export function tagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Splits a title so its last word can take the serif accent of the site's headings. */
export function accentTitle(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/);
  const accent = words.length > 1 ? (words.pop() ?? '') : '';
  return { lead: words.join(' '), accent };
}
