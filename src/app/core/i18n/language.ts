/** The site's languages: English at today's URLs, Spanish under `/es` (RF-118 to RF-120). */
export type Lang = 'en' | 'es';

/** URLs of one page in each language. */
export interface Alternates {
  en: string;
  es: string;
}

const SPANISH_PREFIX = /^\/es(?=$|[/?#])/;

/** The language of a site path (`/es`, `/es/...` are Spanish; anything else is English). */
export function langFromPath(path: string): Lang {
  return SPANISH_PREFIX.test(path) ? 'es' : 'en';
}

/** The same site path in `lang`: adds or strips the `/es` prefix; `/es` is the Spanish home. */
export function localizePath(path: string, lang: Lang): string {
  // Only the pathname changes; the query and the fragment are kept.
  const split = path.search(/[?#]/);
  const pathname = split === -1 ? path : path.slice(0, split);
  const rest = split === -1 ? '' : path.slice(split);
  const english = pathname.replace(SPANISH_PREFIX, '') || '/';
  if (lang === 'en') return english + rest;
  return (english === '/' ? '/es' : `/es${english}`) + rest;
}
