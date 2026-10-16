const PRODUCTION_AGENT_URL = 'https://agent.figueroa-sanchez.com';

// Replaced at build/serve time by `scripts/ng.mjs` (`--define`) when `AGENT_URL` is set
// (Spec 001 RF-30). Like `API_URL`, it is baked into the JS of each build.
declare const NG_AGENT_URL: string | undefined;

const normalize = (value: string): string => value.trim().replace(/\/+$/, '');

/** Normalizes the configured assistant API URL; an unset or blank value means production. */
export function resolveAgentUrl(value: string | undefined): string {
  return normalize(value ?? '') || PRODUCTION_AGENT_URL;
}

// `typeof` avoids a ReferenceError when the build defines no NG_AGENT_URL (tests, plain `ng`).
export const AGENT_URL =
  typeof NG_AGENT_URL === 'string' ? normalize(NG_AGENT_URL) : resolveAgentUrl(undefined);
