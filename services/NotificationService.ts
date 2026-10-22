import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { PlannedReminder } from '../models/ReminderModel';

type NotificationsModule = typeof import('expo-notifications');

/** Whether the phone lets TripHub show notifications. */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const REMINDER_CHANNEL = 'reminders';
const EXPENSE_CHANNEL = 'expenses';

/**
 * Local notifications are skipped in Expo Go and on the web. Expo Go dropped notification
 * support in SDK 53, and merely importing expo-notifications there prints warnings, so the
 * module is only loaded where it's usable (development, preview and store builds).
 */
const supported = Platform.OS !== 'web' && !isRunningInExpoGo();

let modulePromise: Promise<NotificationsModule> | null = null;
function load(): Promise<NotificationsModule> {
  modulePromise ??= import('expo-notifications');
  return modulePromise;
}

/** What TripHub stores in each notification it schedules, so it can find its own later. */
interface ReminderData {
  kind: 'activity';
  tripId: string;
  itemId: string;
}

function isActivityReminderFor(data: unknown, tripId?: string): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Partial<ReminderData>;
  return d.kind === 'activity' && (tripId === undefined || d.tripId === tripId);
}

/**
 * Local notifications: reminders before itinerary activities, and alerts when someone else
 * logs an expense. Nothing here is sent through a server; the phone schedules them itself.
 * Every method is safe to call where notifications aren't available (it does nothing) and
 * never throws: a reminder that can't be scheduled must not break the screen that asked.
 */
export const NotificationService = {
  isSupported(): boolean {
    return supported;
  },

  /** Call once at app start: shows notifications while the app is open, and sets up the Android channels. */
  async configure(): Promise<void> {
    if (!supported) return;
    try {
      const Notifications = await load();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
          name: 'Activity reminders',
          description: 'Shortly before a planned activity starts',
          importance: Notifications.AndroidImportance.HIGH,
        });
        await Notifications.setNotificationChannelAsync(EXPENSE_CHANNEL, {
          name: 'New expenses',
          description: 'When someone else on your trip logs an expense',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    } catch (e) {
      console.warn('Setting up notifications failed', e);
    }
  },

  async getPermission(): Promise<NotificationPermission> {
    if (!supported) return 'unsupported';
    try {
      const Notifications = await load();
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
      return settings.canAskAgain ? 'undetermined' : 'denied';
    } catch (e) {
      console.warn('Reading notification permission failed', e);
      return 'unsupported';
    }
  },

  /** Ask the system for permission (shows the prompt the first time; afterwards just reports the answer). */
  async requestPermission(): Promise<NotificationPermission> {
    if (!supported) return 'unsupported';
    try {
      const Notifications = await load();
      const settings = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
      return settings.canAskAgain ? 'undetermined' : 'denied';
    } catch (e) {
      console.warn('Asking for notification permission failed', e);
      return 'unsupported';
    }
  },

  /**
   * Make the scheduled reminders for one trip match `reminders` exactly: anything no longer
   * planned is cancelled, everything planned is (re)scheduled. Other trips' reminders are
   * left alone. Pass an empty list to clear the trip's reminders.
   */
  async syncActivityReminders(tripId: string, reminders: PlannedReminder[]): Promise<void> {
    if (!supported) return;
    try {
      const Notifications = await load();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((n) => isActivityReminderFor(n.content.data, tripId))
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
      );
      if (reminders.length === 0) return;
      if ((await NotificationService.getPermission()) !== 'granted') return;
      for (const r of reminders) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.identifier,
          content: {
            title: r.title,
            body: r.body,
            data: { kind: 'activity', tripId: r.tripId, itemId: r.itemId } satisfies ReminderData,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: REMINDER_CHANNEL },
        });
      }
    } catch (e) {
      console.warn('Scheduling activity reminders failed', e);
    }
  },

  /** Cancel every activity reminder TripHub scheduled (on sign-out, or when reminders are turned off). */
  async cancelAllActivityReminders(): Promise<void> {
    if (!supported) return;
    try {
      const Notifications = await load();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((n) => isActivityReminderFor(n.content.data))
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
      );
    } catch (e) {
      console.warn('Cancelling reminders failed', e);
    }
  },

  /** Show an alert straight away (a new expense from someone else). Does nothing without permission. */
  async showNow(title: string, body: string): Promise<void> {
    if (!supported) return;
    try {
      if ((await NotificationService.getPermission()) !== 'granted') return;
      const Notifications = await load();
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: Platform.OS === 'android' ? { channelId: EXPENSE_CHANNEL } : null,
      });
    } catch (e) {
      console.warn('Showing a notification failed', e);
    }
  },
};
