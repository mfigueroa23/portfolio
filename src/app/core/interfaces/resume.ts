// Resume preview (Spec 006): the current resume PDF from `GET {API_URL}/resume`.

/** Why a load failed: no resume assigned (404), anything else, or no answer in time. */
export type ResumeFailure = 'not-found' | 'generic' | 'timeout';

/** Outcome of one load; the service never throws (plan D4). */
export type ResumeResult = { ok: true; data: Uint8Array } | { ok: false; reason: ResumeFailure };
