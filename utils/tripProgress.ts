import { daysBetween } from './dates';

export interface TripProgress {
  dayCount: number;
  /** Index of today within the trip; null before it starts, `dayCount` after it ends. */
  todayIndex: number | null;
  /** "Day 2 of 5", "Starts in 12 days", "Starts tomorrow", or "Trip ended". */
  label: string;
}

/** Where today falls in a trip, for the Route progress on Home. Display only. */
export function tripProgress(startISO: string, endISO: string, todayISO: string): TripProgress {
  const days = daysBetween(startISO, endISO);
  const dayCount = Math.max(1, days.length);
  if (todayISO < startISO) {
    const until = daysBetween(todayISO, startISO).length - 1;
    return { dayCount, todayIndex: null, label: until === 1 ? 'Starts tomorrow' : `Starts in ${until} days` };
  }
  if (todayISO > endISO) return { dayCount, todayIndex: dayCount, label: 'Trip ended' };
  const index = days.indexOf(todayISO);
  return { dayCount, todayIndex: index, label: `Day ${index + 1} of ${dayCount}` };
}
