import { z } from 'zod';
import { formatDateRange, isValidClockTime, isValidISODate } from '../utils/dates';
import { NewItineraryItem } from './ItineraryModel';
import { firstIssuePerField, Validation } from './validation';

export const ITINERARY_TITLE_MAX = 100;
export const ITINERARY_LOCATION_MAX = 120;
export const ITINERARY_NOTES_MAX = 1000;

/** The trip's first and last day (YYYY-MM-DD); an activity's day must fall inside. */
export interface TripDateRange {
  start: string;
  end: string;
}

/** Raw values from the activity form. `time`, `location` and `notes` may be empty. */
export interface ItineraryFormValues {
  title: string;
  day: string;
  time: string;
  location: string;
  notes: string;
}

export const EMPTY_ITINERARY_FORM: ItineraryFormValues = { title: '', day: '', time: '', location: '', notes: '' };

function itinerarySchema(range: TripDateRange) {
  const tripDays = formatDateRange(range.start, range.end);
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(ITINERARY_TITLE_MAX, `Keep the title under ${ITINERARY_TITLE_MAX} characters.`),
    day: z
      .string()
      .min(1, 'Day is required.')
      .refine((v) => v === '' || isValidISODate(v), 'Day must be a real date.')
      .refine(
        (v) => !isValidISODate(v) || (v >= range.start && v <= range.end),
        `Day must fall within the trip dates (${tripDays}).`,
      ),
    time: z.string().refine((v) => v === '' || isValidClockTime(v), 'Enter a valid time.'),
    location: z.string().trim().max(ITINERARY_LOCATION_MAX, `Keep the location under ${ITINERARY_LOCATION_MAX} characters.`),
    notes: z.string().trim().max(ITINERARY_NOTES_MAX, `Keep the notes under ${ITINERARY_NOTES_MAX} characters.`),
  });
}

/** Validate the activity form against the trip's dates; empty optional fields become null. */
export function validateItineraryForm(
  values: ItineraryFormValues,
  range: TripDateRange,
): Validation<ItineraryFormValues, NewItineraryItem> {
  const result = itinerarySchema(range).safeParse(values);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };

  const { title, day, time, location, notes } = result.data;
  return {
    ok: true,
    data: { title, day, time: time || null, location: location || null, notes: notes || null },
  };
}
