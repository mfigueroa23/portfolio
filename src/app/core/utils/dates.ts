import { Lang } from '../i18n/language';

// Publication dates are instants (ISO strings); certification dates are calendar dates
// (`YYYY-MM-DD`) that must be shown exactly as stored (RF-110–RF-113).

const DISPLAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

/** English keeps today's `Oct 5, 2026`; Spanish reads `5 oct 2026` (Spec 004 RF-133, RF-134). */
const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es' };

function format(lang: Lang, options: Intl.DateTimeFormatOptions, date: number | Date): string {
  const text = new Intl.DateTimeFormat(LOCALES[lang], { ...DISPLAY, ...options }).format(date);
  // Some ICU versions abbreviate Spanish months with a period (`oct.`); RF-134 shows `oct`.
  return lang === 'es' ? text.replace(/\.(?= )/, '').replace(/ de /g, ' ') : text;
}

/** The `YYYY-MM-DD` date of an instant in a time zone (the runtime's zone when omitted). */
export function calendarDateIn(instant: Date, timeZone?: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * Whether a certification has expired: its expiry date is earlier than today's date in the
 * visitor's time zone, so it is still valid on the expiry date itself (RF-82).
 */
export function isExpired(expiryDate: string | null, now: Date, timeZone?: string): boolean {
  return expiryDate !== null && expiryDate < calendarDateIn(now, timeZone);
}

/** Formats a calendar date as `Mar 1, 2025` (`1 mar 2025`), without any time-zone shift. */
export function formatCalendarDate(date: string, lang: Lang = 'en'): string {
  const [year, month, day] = date.split('-').map(Number);
  // Formatting the UTC midnight in UTC keeps the same calendar day everywhere.
  return format(lang, { timeZone: 'UTC' }, Date.UTC(year, month - 1, day));
}

/** Formats an instant as a calendar date in a time zone (the runtime's zone when omitted). */
export function formatInstant(iso: string, timeZone?: string, lang: Lang = 'en'): string {
  return format(lang, { timeZone }, new Date(iso));
}
