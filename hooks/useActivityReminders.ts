import { useEffect, useMemo, useRef } from 'react';
import { ReminderModel } from '../models/ReminderModel';
import { NotificationService } from '../services/NotificationService';
import { useItinerary } from './useItinerary';
import { useNotificationSettings } from './useNotificationSettings';
import { useTrip } from './useTrip';

/** Wait this long after the last itinerary change before rescheduling, so a burst of edits reschedules once. */
const SETTLE_MS = 800;

/**
 * Keeps the active trip's activity reminders in step with its itinerary: added, moved,
 * retimed or deleted activities (including changes from other phones) reschedule them, and
 * turning reminders off clears them. Mounted once, under the trip's providers.
 */
export function useActivityReminders() {
  const { activeTrip } = useTrip();
  const { items, loading } = useItinerary();
  const { prefs, permission } = useNotificationSettings();
  const tripId = activeTrip?.id ?? null;
  const tripName = activeTrip?.name ?? '';
  const enabled = prefs.activityReminders && permission === 'granted';
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  // Only what affects reminders: rescheduling for an unrelated change (notes, order) would be wasted work.
  const signature = useMemo(
    () =>
      items
        .filter((i) => i.time)
        .map((i) => `${i.id}|${i.day}|${i.time}|${i.title}|${i.location ?? ''}`)
        .sort()
        .join('\n'),
    [items],
  );

  useEffect(() => {
    if (!tripId || loading) return;
    const timer = setTimeout(() => {
      const planned = enabled
        ? ReminderModel.planActivityReminders({ id: tripId, name: tripName }, itemsRef.current, new Date())
        : [];
      void NotificationService.syncActivityReminders(tripId, planned);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [tripId, tripName, loading, enabled, signature]); // `signature` stands in for the items that matter
}
