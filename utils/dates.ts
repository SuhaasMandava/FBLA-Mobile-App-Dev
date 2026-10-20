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

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Month number (1-12) for "sep", "sept", "September"; null for anything else. */
function monthFromWord(word: string): number | null {
  if (word.length < 3) return null;
  const i = MONTHS.indexOf(word.slice(0, 3));
  if (i < 0) return null;
  const full = new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  return full.startsWith(word) || word === 'sept' ? i + 1 : null;
}

function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Builds a YYYY-MM-DD, or null if it isn't a real day. A missing year means the next time that day comes around. */
function buildDate(month: number, day: number, year: number | null, today: string): string | null {
  const todayYear = Number(today.slice(0, 4));
  const make = (y: number) => `${String(y).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
  if (year !== null) {
    const iso = make(year < 100 ? 2000 + year : year);
    return isValidISODate(iso) ? iso : null;
  }
  const thisYear = make(todayYear);
  if (isValidISODate(thisYear) && thisYear >= today) return thisYear;
  const nextYear = make(todayYear + 1);
  return isValidISODate(nextYear) ? nextYear : null;
}

/** "9/21" or "21/9": the first number is the month unless it can't be one. */
function monthAndDay(a: number, b: number): [month: number, day: number] {
  return a > 12 && b <= 12 ? [b, a] : [a, b];
}

/**
 * Reads a typed date in most of the ways people write one and returns YYYY-MM-DD, or null if it
 * can't be understood. Handles 09/21/2026, 9-21-26, 9.21.2026, 2026-09-21, 20260921, 092126,
 * "sept 21 2026", "21 September", "Sep 21" (no year: the next one), and today / tomorrow /
 * yesterday / "fri" / "next friday" / "in 3 days" / "next week". Numbers are month first (US).
 */
export function parseDateInput(input: string, now: Date = new Date()): string | null {
  const today = todayISO(now);
  let s = input
    .trim()
    .toLowerCase()
    .replace(/[,]/g, ' ')
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
    .replace(/\b(of|the|on)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  if (s === 'today' || s === 'tod') return today;
  if (s === 'tomorrow' || s === 'tmrw' || s === 'tmr') return addDays(today, 1);
  if (s === 'yesterday') return addDays(today, -1);
  if (s === 'next week') return addDays(today, 7);
  const inDays = /^in (\d{1,3}) (day|days|week|weeks)$/.exec(s);
  if (inDays) return addDays(today, Number(inDays[1]) * (inDays[2].startsWith('week') ? 7 : 1));
  const weekday = /^(?:(next|this) )?([a-z]{3,9})$/.exec(s);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[2].slice(0, 3));
    const full = target >= 0 ? new Date(2000, 0, 2 + target).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : '';
    if (target >= 0 && full.startsWith(weekday[2])) {
      const ahead = (target - now.getDay() + 7) % 7 || 7; // today's weekday means a week from now
      return addDays(today, ahead);
    }
  }

  // Only digits: 20260921, 09212026, 092126, 0921
  if (/^\d+$/.test(s)) {
    if (s.length === 8) {
      return /^(19|20)/.test(s)
        ? buildDate(Number(s.slice(4, 6)), Number(s.slice(6)), Number(s.slice(0, 4)), today)
        : buildDate(Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4)), today);
    }
    if (s.length === 6) return buildDate(Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4)), today);
    if (s.length === 4) return buildDate(Number(s.slice(0, 2)), Number(s.slice(2)), null, today);
    return null;
  }

  // Numbers split by / - . or spaces: 9/21/2026, 2026-09-21, 9-21, 21.9.26
  const numeric = /^(\d{1,4})[/\-. ](\d{1,2})(?:[/\-. ](\d{1,4}))?$/.exec(s);
  if (numeric) {
    const [first, second, third] = [numeric[1], numeric[2], numeric[3]];
    if (first.length === 4) {
      return third ? buildDate(Number(second), Number(third), Number(first), today) : null;
    }
    const [month, day] = monthAndDay(Number(first), Number(second));
    return buildDate(month, day, third ? Number(third) : null, today);
  }

  // A month name with a day and maybe a year, in either order: "sept 21 2026", "21 september", "sep21"
  s = s.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
  const words = s.split(' ');
  const months = words.map(monthFromWord).filter((m): m is number => m !== null);
  const numbers = words.filter((w) => /^\d+$/.test(w));
  if (months.length === 1 && words.length === months.length + numbers.length && numbers.length >= 1 && numbers.length <= 2) {
    const yearWord = numbers.find((n) => n.length === 4) ?? (numbers.length === 2 ? numbers[1] : undefined);
    const dayWord = numbers.find((n) => n !== yearWord) ?? numbers[0];
    if (numbers.length === 1 && numbers[0].length === 4) return null; // "sept 2026" has no day
    return buildDate(months[0], Number(dayWord), yearWord ? Number(yearWord) : null, today);
  }
  return null;
}

/**
 * Reads a typed time and returns 24-hour "HH:MM", or null. Handles 9:30 pm, 9pm, 930, 0930, 1430,
 * 9.30a, 14:30, noon and midnight. A bare hour with no am/pm is taken as written (9 is 09:00, 14 is 14:00).
 */
export function parseTimeInput(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '').replace(/([ap])\.?m\.?/g, '$1m').replace(/\./g, ':');
  if (s === 'noon') return '12:00';
  if (s === 'midnight') return '00:00';
  const match = /^(\d{1,2})(?::?(\d{2}))?(a|p|am|pm)?$/.exec(s);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.[0];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'p' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}
