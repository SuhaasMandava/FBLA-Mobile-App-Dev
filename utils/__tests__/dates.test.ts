import { parseDateInput, parseTimeInput } from '../dates';

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
