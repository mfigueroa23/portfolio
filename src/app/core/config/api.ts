const PRODUCTION_API_URL = 'https://api.figueroa-sanchez.com';

// Replaced at build/serve time by `scripts/ng.mjs` (`--define`) when `API_URL` is set.
// The site is prerendered, so the URL is baked into the HTML and JS of each build.
declare const NG_API_URL: string | undefined;

const normalize = (value: string): string => value.trim().replace(/\/+$/, '');

/** Normalizes the configured API URL; an unset or blank value means production. */
export function resolveApiUrl(value: string | undefined): string {
  return normalize(value ?? '') || PRODUCTION_API_URL;
}

// `typeof` avoids a ReferenceError when the build defines no NG_API_URL (tests, plain `ng`).
// With a define the condition is constant, so the production fallback is dropped from the
// bundle; `scripts/ng.mjs` never defines a blank value.
export const API_URL =
  typeof NG_API_URL === 'string' ? normalize(NG_API_URL) : resolveApiUrl(undefined);

/**
 * Whether `url` is on the API origin, so the site may fetch it (`connect-src`, CORS). Origins
 * are compared, not prefixes, so a lookalike host never matches (Spec 008 RF-01, RF-02, D9).
 */
export function isApiUrl(url: string): boolean {
  try {
    return new URL(url).origin === new URL(API_URL).origin;
  } catch {
    return false;
  }
}
