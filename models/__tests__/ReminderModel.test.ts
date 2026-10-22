import { Expense } from '../ExpenseModel';
import { ItineraryItem } from '../ItineraryModel';
import {
  activityStart,
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  REMINDER_LEAD_MINUTES,
  ReminderModel,
} from '../ReminderModel';
import { Trip } from '../TripModel';

const trip: Trip = {
  id: 't',
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  budgetCents: 0,
  inviteCode: null,
  members: [
    { userId: 'sam', role: 'organizer', displayName: 'Sam Lee' },
    { userId: 'alex', role: 'member', displayName: null },
  ],
};

let n = 0;
const activity = (day: string, time: string | null, overrides: Partial<ItineraryItem> = {}): ItineraryItem => {
  n += 1;
  return { id: `a${n}`, tripId: 't', day, time, title: `Activity ${n}`, location: null, notes: null, sortOrder: n, createdBy: 'sam', ...overrides };
};

// Local time, so the expectations hold in any time zone.
const NOW = new Date(2026, 6, 2, 9, 0);

describe('activityStart', () => {
  it('combines the day and time in local time', () => {
    expect(activityStart({ day: '2026-07-03', time: '14:30' })).toEqual(new Date(2026, 6, 3, 14, 30));
  });

  it('is null without a start time', () => {
    expect(activityStart({ day: '2026-07-03', time: null })).toBeNull();
  });
});

describe('ReminderModel.planActivityReminders', () => {
  it(`fires ${REMINDER_LEAD_MINUTES} minutes before each timed activity, soonest first`, () => {
    const later = activity('2026-07-04', '10:00', { title: 'Snorkel', location: 'Molokini' });
    const sooner = activity('2026-07-02', '18:00', { title: 'Luau' });
    const plan = ReminderModel.planActivityReminders(trip, [later, sooner], NOW);
    expect(plan.map((r) => r.itemId)).toEqual([sooner.id, later.id]);
    expect(plan[0]).toEqual({
      identifier: `activity:${sooner.id}`,
      tripId: 't',
      itemId: sooner.id,
      fireAt: new Date(2026, 6, 2, 17, 30),
      title: `Luau in ${REMINDER_LEAD_MINUTES} minutes`,
      body: 'Beach week',
    });
    expect(plan[1].body).toBe('Molokini · Beach week');
  });

  it('skips activities without a time and reminders that would already have gone off', () => {
    const untimed = activity('2026-07-03', null);
    const past = activity('2026-07-01', '12:00');
    const startingSoon = activity('2026-07-02', '09:20'); // reminder time 08:50 has passed
    expect(ReminderModel.planActivityReminders(trip, [untimed, past, startingSoon], NOW)).toEqual([]);
  });

  it('caps how many are kept scheduled', () => {
    const many = Array.from({ length: 30 }, (_, i) => activity('2026-07-05', `${String(i % 24).padStart(2, '0')}:00`));
    expect(ReminderModel.planActivityReminders(trip, many, NOW, 30, 5)).toHaveLength(5);
  });

  it('uses a stable identifier per activity, so rescheduling replaces instead of duplicating', () => {
    const item = activity('2026-07-05', '10:00');
    const first = ReminderModel.planActivityReminders(trip, [item], NOW)[0];
    const moved = ReminderModel.planActivityReminders(trip, [{ ...item, time: '11:00' }], NOW)[0];
    expect(moved.identifier).toBe(first.identifier);
    expect(moved.fireAt.getTime() - first.fireAt.getTime()).toBe(60 * 60_000);
  });
});

describe('ReminderModel.expenseAlert', () => {
  const expense: Expense = {
    id: 'e',
    tripId: 't',
    paidBy: 'sam',
    description: 'Dinner',
    amountCents: 4250,
    category: 'food',
    splits: { sam: 2125, alex: 2125 },
    shares: null,
    createdAt: '2026-07-02T19:00:00Z',
  };

  it("tells you who paid what when it's someone else", () => {
    const alert = ReminderModel.expenseAlert(expense, trip, 'alex');
    expect(alert?.title).toBe('New expense on Beach week');
    expect(alert?.body).toMatch(/^Sam Lee paid .*42\.50 for Dinner\.$/);
  });

  it('stays quiet about your own expenses', () => {
    expect(ReminderModel.expenseAlert(expense, trip, 'sam')).toBeNull();
  });

  it('names a payer who has left the trip generically', () => {
    expect(ReminderModel.expenseAlert({ ...expense, paidBy: 'gone' }, trip, 'alex')?.body).toMatch(/^Someone paid/);
  });
});

describe('parseNotificationPrefs', () => {
  it('defaults to on', () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(DEFAULT_NOTIFICATION_PREFS).toEqual({ activityReminders: true, expenseAlerts: true });
  });

  it('reads saved choices and ignores anything malformed', () => {
    expect(parseNotificationPrefs('{"activityReminders":false,"expenseAlerts":true}')).toEqual({
      activityReminders: false,
      expenseAlerts: true,
    });
    expect(parseNotificationPrefs('{"activityReminders":"no"}')).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs('not json')).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});
