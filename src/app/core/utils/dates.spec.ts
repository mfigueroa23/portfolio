import { calendarDateIn, formatCalendarDate, formatInstant, isExpired } from './dates';

describe('isExpired', () => {
  const noon = new Date('2026-10-04T12:00:00Z');

  it('is not expired on the expiry date itself', () => {
    expect(isExpired('2026-10-04', noon, 'UTC')).toBe(false);
  });

  it('is expired once the expiry date has passed', () => {
    expect(isExpired('2026-10-03', noon, 'UTC')).toBe(true);
  });

  it('is not expired before the expiry date', () => {
    expect(isExpired('2026-10-05', noon, 'UTC')).toBe(false);
  });

  it('never expires without an expiry date', () => {
    expect(isExpired(null, noon, 'UTC')).toBe(false);
  });

  it("uses the calendar date of the visitor's time zone", () => {
    // 02:00 UTC on Oct 5 is still Oct 4 in Santiago (UTC-3).
    const instant = new Date('2026-10-05T02:00:00Z');
    expect(isExpired('2026-10-04', instant, 'UTC')).toBe(true);
    expect(isExpired('2026-10-04', instant, 'America/Santiago')).toBe(false);
  });
});

describe('calendarDateIn', () => {
  it('returns the YYYY-MM-DD date in the given time zone', () => {
    const instant = new Date('2026-10-03T23:30:00Z');
    expect(calendarDateIn(instant, 'UTC')).toBe('2026-10-03');
    expect(calendarDateIn(instant, 'Asia/Tokyo')).toBe('2026-10-04');
  });
});

describe('formatCalendarDate', () => {
  it('shows the stored calendar date without a time-zone shift', () => {
    expect(formatCalendarDate('2025-03-01')).toBe('Mar 1, 2025');
    expect(formatCalendarDate('2024-12-31')).toBe('Dec 31, 2024');
  });
});

describe('formatInstant', () => {
  it('formats an instant as a calendar date in the given time zone', () => {
    const iso = '2026-10-03T23:30:00Z';
    expect(formatInstant(iso, 'UTC')).toBe('Oct 3, 2026');
    expect(formatInstant(iso, 'Asia/Tokyo')).toBe('Oct 4, 2026');
  });
});

describe('dates in Spanish (RF-134)', () => {
  it('formats a calendar date as "5 oct 2026"', () => {
    expect(formatCalendarDate('2026-10-05', 'es')).toBe('5 oct 2026');
  });

  it('formats an instant as "5 oct 2026"', () => {
    expect(formatInstant('2026-10-05T12:00:00Z', 'UTC', 'es')).toBe('5 oct 2026');
  });

  it('keeps the English formats by default (RF-133)', () => {
    expect(formatCalendarDate('2026-10-05')).toBe('Oct 5, 2026');
    expect(formatInstant('2026-10-05T12:00:00Z', 'UTC', 'en')).toBe('Oct 5, 2026');
  });
});
