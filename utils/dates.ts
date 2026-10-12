const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today's date on the device, as YYYY-MM-DD (local time, not UTC). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True for a well-formed YYYY-MM-DD that is also a real calendar date (rejects 2026-02-31). */
export function isValidISODate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** True for a 24-hour "HH:MM" time. */
export function isValidClockTime(value: string): boolean {
  return CLOCK_TIME.test(value);
}

/**
 * A YYYY-MM-DD as a local Date at noon. Noon (not midnight) keeps the calendar
 * day stable across daylight-saving shifts; `new Date('YYYY-MM-DD')` would parse as UTC
 * and can land on the previous day.
 */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** The calendar day a picker returned, as YYYY-MM-DD (read in local time). */
export function toISODate(date: Date): string {
  return todayISO(date);
}

/** "HH:MM" as a Date today at that local time, for feeding a time picker. */
export function parseClockTime(time: string, base: Date = new Date()): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0);
}

/** The time of day a picker returned, as 24-hour "HH:MM". */
export function toClockTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatShortDate(iso: string, withYear: boolean): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** "Jul 12, 2026" */
export function formatDate(iso: string): string {
  return formatShortDate(iso, true);
}

/** "Sat, Jul 12" — for day headings. */
export function formatDayHeading(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "9:30 AM" (or "09:30" depending on the device's locale). */
export function formatClockTime(time: string): string {
  return parseClockTime(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Jul 12 – Jul 19, 2026" (year shown once when both dates share it). */
export function formatDateRange(startISO: string, endISO: string): string {
  const sameYear = startISO.slice(0, 4) === endISO.slice(0, 4);
  const start = formatShortDate(startISO, !sameYear);
  const end = formatShortDate(endISO, true);
  return `${start} – ${end}`;
}

/** Every day from start to end inclusive, as YYYY-MM-DD. Capped so a bad range can't produce a huge list. */
export function daysBetween(startISO: string, endISO: string, maxDays = 366): string[] {
  const days: string[] = [];
  const cursor = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (cursor <= end && days.length < maxDays) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
