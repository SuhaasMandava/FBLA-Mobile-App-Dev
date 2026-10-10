const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

/** Turn whatever the user typed into progressive YYYY-MM-DD: "20261012" → "2026-10-12". */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function formatShortDate(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.split('-').map(Number);
  // Build from local components: `new Date('YYYY-MM-DD')` parses as UTC and can display the previous day.
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** "Jul 12 – Jul 19, 2026" (year shown once when both dates share it). */
export function formatDateRange(startISO: string, endISO: string): string {
  const sameYear = startISO.slice(0, 4) === endISO.slice(0, 4);
  const start = formatShortDate(startISO, !sameYear);
  const end = formatShortDate(endISO, true);
  return `${start} – ${end}`;
}
