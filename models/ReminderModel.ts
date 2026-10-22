import { Expense } from './ExpenseModel';
import { ItineraryItem } from './ItineraryModel';
import { Trip, TripModel } from './TripModel';
import { formatCents } from '../utils/money';

/**
 * What to remind people about and when, worked out from trip data. Pure data: no React,
 * no device APIs. NotificationService turns these into local notifications.
 */

/** How long before an activity its reminder goes off. */
export const REMINDER_LEAD_MINUTES = 30;

/**
 * At most this many activity reminders are kept scheduled per trip. iOS keeps only 64
 * pending local notifications per app, so this leaves room for more than one trip.
 */
export const MAX_ACTIVITY_REMINDERS = 20;

export interface PlannedReminder {
  /** Stable per activity, so rescheduling replaces rather than duplicates. */
  identifier: string;
  tripId: string;
  itemId: string;
  fireAt: Date;
  title: string;
  body: string;
}

export interface NotificationPrefs {
  activityReminders: boolean;
  expenseAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { activityReminders: true, expenseAlerts: true };

/** Read saved preferences, falling back to the defaults for anything missing or malformed. */
export function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    const saved = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      activityReminders:
        typeof saved.activityReminders === 'boolean' ? saved.activityReminders : DEFAULT_NOTIFICATION_PREFS.activityReminders,
      expenseAlerts: typeof saved.expenseAlerts === 'boolean' ? saved.expenseAlerts : DEFAULT_NOTIFICATION_PREFS.expenseAlerts,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

/** When an activity starts, in the phone's local time; null if it has no start time. */
export function activityStart(item: Pick<ItineraryItem, 'day' | 'time'>): Date | null {
  if (!item.time) return null;
  const [year, month, day] = item.day.split('-').map(Number);
  const [hours, minutes] = item.time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export const ReminderModel = {
  identifierFor(itemId: string): string {
    return `activity:${itemId}`;
  },

  /**
   * The reminders a trip's itinerary calls for right now: one per activity with a start
   * time whose reminder is still in the future, soonest first, capped at `limit`.
   */
  planActivityReminders(
    trip: Pick<Trip, 'id' | 'name'>,
    items: ItineraryItem[],
    now: Date,
    leadMinutes: number = REMINDER_LEAD_MINUTES,
    limit: number = MAX_ACTIVITY_REMINDERS,
  ): PlannedReminder[] {
    return items
      .flatMap((item) => {
        const start = activityStart(item);
        if (!start) return [];
        const fireAt = new Date(start.getTime() - leadMinutes * 60_000);
        if (fireAt.getTime() <= now.getTime()) return [];
        return [
          {
            identifier: ReminderModel.identifierFor(item.id),
            tripId: trip.id,
            itemId: item.id,
            fireAt,
            title: `${item.title} in ${leadMinutes} minutes`,
            body: item.location ? `${item.location} · ${trip.name}` : trip.name,
          },
        ];
      })
      .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.itemId.localeCompare(b.itemId))
      .slice(0, limit);
  },

  /** The alert for an expense someone else paid; null for your own (you know about those). */
  expenseAlert(expense: Expense, trip: Trip, me: string | null): { title: string; body: string } | null {
    if (expense.paidBy === me) return null;
    const payer = trip.members.find((m) => m.userId === expense.paidBy);
    const name = payer ? TripModel.memberName(payer) : 'Someone';
    return {
      title: `New expense on ${trip.name}`,
      body: `${name} paid ${formatCents(expense.amountCents)} for ${expense.description}.`,
    };
  },
};
