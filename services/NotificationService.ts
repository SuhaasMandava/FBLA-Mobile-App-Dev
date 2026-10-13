import { isRunningInExpoGo } from 'expo';

/**
 * Local-notification wrapper. Stubbed: methods log and return without
 * scheduling anything yet. The real expo-notifications calls are sketched in
 * comments so the wiring is obvious when this is filled in.
 */
export const NotificationService = {
  /**
   * Call once at app start so foreground notifications are shown. Skipped in
   * Expo Go, which dropped notification support in SDK 53: there, merely importing
   * expo-notifications prints warnings, so the module is only loaded when usable.
   */
  async configure(): Promise<void> {
    if (isRunningInExpoGo()) return;
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  },

  /** Remind the user shortly before an itinerary activity. Returns a notification id (null while stubbed). */
  async scheduleActivityReminder(
    activityTitle: string,
    startsAt: Date,
    minutesBefore = 30,
  ): Promise<string | null> {
    console.log('[NotificationService] scheduleActivityReminder (stub)', {
      activityTitle,
      fireAt: new Date(startsAt.getTime() - minutesBefore * 60_000),
    });
    // TODO: await Notifications.requestPermissionsAsync(), then
    // Notifications.scheduleNotificationAsync({
    //   content: { title: activityTitle, body: `Starts in ${minutesBefore} min` },
    //   trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    // });
    return null;
  },

  /** Tell the user a trip member added an expense. */
  async notifyNewExpense(tripName: string, description: string, amountCents: number): Promise<void> {
    console.log('[NotificationService] notifyNewExpense (stub)', {
      tripName,
      description,
      amountCents,
    });
    // TODO: Notifications.scheduleNotificationAsync({ content: {...}, trigger: null });
  },
};
