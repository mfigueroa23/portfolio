/** File extension of each type a certificate can have (Spec 008 RF-18). */
const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * Download name of a certificate: its name in kebab-case, without accents or symbols, plus the
 * extension of its type; the same in both languages (RF-18, plan D8).
 */
export function certificateFileName(name: string, mime: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'certificate'}.${EXTENSIONS[mime] ?? 'bin'}`;
}
