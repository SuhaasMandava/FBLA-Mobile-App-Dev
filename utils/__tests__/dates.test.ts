import { formatRelativeTime, parseDateInput, parseTimeInput } from '../dates';

// Tuesday, Oct 20, 2026
const NOW = new Date(2026, 9, 20, 10, 0, 0);

describe('parseDateInput', () => {
  it.each([
    ['09/21/2026', '2026-09-21'],
    ['9/21/2026', '2026-09-21'],
    ['9-21-26', '2026-09-21'],
    ['9.21.2026', '2026-09-21'],
    ['2026-09-21', '2026-09-21'],
    ['2026/9/21', '2026-09-21'],
    ['20260921', '2026-09-21'],
    ['09212026', '2026-09-21'],
    ['092126', '2026-09-21'],
    ['21/9/2026', '2026-09-21'],
    ['sept 21 2026', '2026-09-21'],
    ['Sep 21, 2026', '2026-09-21'],
    ['September 21st, 2026', '2026-09-21'],
    ['21 sept 2026', '2026-09-21'],
    ['21st of September 2026', '2026-09-21'],
    ['sep21 2026', '2026-09-21'],
  ])('reads %s', (input, expected) => {
    expect(parseDateInput(input, NOW)).toBe(expected);
  });

  it('picks the next occurrence when the year is left off', () => {
    expect(parseDateInput('12/25', NOW)).toBe('2026-12-25');
    expect(parseDateInput('sep 21', NOW)).toBe('2027-09-21');
    expect(parseDateInput('10/20', NOW)).toBe('2026-10-20');
    expect(parseDateInput('21 Dec', NOW)).toBe('2026-12-21');
  });

  it('reads relative dates', () => {
    expect(parseDateInput('today', NOW)).toBe('2026-10-20');
    expect(parseDateInput('Tomorrow', NOW)).toBe('2026-10-21');
    expect(parseDateInput('yesterday', NOW)).toBe('2026-10-19');
    expect(parseDateInput('fri', NOW)).toBe('2026-10-23');
    expect(parseDateInput('next friday', NOW)).toBe('2026-10-23');
    expect(parseDateInput('tue', NOW)).toBe('2026-10-27');
    expect(parseDateInput('in 3 days', NOW)).toBe('2026-10-23');
    expect(parseDateInput('in 2 weeks', NOW)).toBe('2026-11-03');
    expect(parseDateInput('next week', NOW)).toBe('2026-10-27');
  });

  it.each(['', '  ', 'abc', '13/45/2026', '02/30/2026', '9/21/', 'sept', 'sept 2026', '2026-13-01', 'monkey', '123'])(
    'rejects %p',
    (input) => {
      expect(parseDateInput(input, NOW)).toBeNull();
    },
  );
});

describe('parseTimeInput', () => {
  it.each([
    ['9:30 pm', '21:30'],
    ['9:30PM', '21:30'],
    ['9pm', '21:00'],
    ['9 a.m.', '09:00'],
    ['930', '09:30'],
    ['0930', '09:30'],
    ['1430', '14:30'],
    ['14:30', '14:30'],
    ['9', '09:00'],
    ['9.30p', '21:30'],
    ['12am', '00:00'],
    ['12pm', '12:00'],
    ['noon', '12:00'],
    ['midnight', '00:00'],
  ])('reads %s', (input, expected) => {
    expect(parseTimeInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '25:00', '9:75', '13pm', '0pm'])('rejects %p', (input) => {
    expect(parseTimeInput(input)).toBeNull();
  });
});

describe('formatRelativeTime', () => {
  // Built from local times, so the expectations hold in any time zone.
  const at = (month: number, day: number, hours: number, minutes = 0, year = 2026) =>
    new Date(year, month - 1, day, hours, minutes).toISOString();

  it('says Just now for under a minute (and for clocks slightly ahead)', () => {
    expect(formatRelativeTime(new Date(2026, 9, 20, 9, 59, 30).toISOString(), NOW)).toBe('Just now');
    expect(formatRelativeTime(at(10, 20, 10, 0), NOW)).toBe('Just now');
    expect(formatRelativeTime(at(10, 20, 10, 2), NOW)).toBe('Just now');
  });

  it('counts minutes, then hours, within today', () => {
    expect(formatRelativeTime(at(10, 20, 9, 59), NOW)).toBe('1 min ago');
    expect(formatRelativeTime(at(10, 20, 9, 55), NOW)).toBe('5 min ago');
    expect(formatRelativeTime(at(10, 20, 7, 30), NOW)).toBe('2 hr ago');
  });

  it('says Yesterday for the previous calendar day, even if under 24 hours ago', () => {
    expect(formatRelativeTime(at(10, 19, 23, 0), NOW)).toBe('Yesterday');
    expect(formatRelativeTime(at(10, 19, 8, 0), NOW)).toBe('Yesterday');
  });

  it('shows the date for anything older, with the year only when it differs', () => {
    expect(formatRelativeTime(at(10, 12, 9), NOW)).toBe(
      new Date(2026, 9, 12, 12).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    );
    expect(formatRelativeTime(at(12, 30, 9, 0, 2025), NOW)).toBe(
      new Date(2025, 11, 30, 12).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    );
  });

  it('returns nothing for a timestamp it cannot read', () => {
    expect(formatRelativeTime('not a date', NOW)).toBe('');
  });
});
