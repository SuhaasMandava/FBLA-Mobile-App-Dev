import { z } from 'zod';
import { isValidISODate, todayISO } from '../utils/dates';
import { normalizeInviteCode } from '../utils/inviteCode';
import { normalizeDollarInput, parseDollarsToCents } from '../utils/money';
import { NewTrip, Trip } from './TripModel';
import { firstIssuePerField, Validation } from './validation';

export const TRIP_NAME_MIN = 3;
export const TRIP_NAME_MAX = 50;
/** Largest budget we accept: keeps cents safely inside Postgres `integer`. */
export const MAX_BUDGET_DOLLARS = 1_000_000;

/** Raw values from the Create Trip inputs — everything is a string until validated. Dates are YYYY-MM-DD. */
export interface CreateTripFormValues {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
}

export const EMPTY_CREATE_TRIP_FORM: CreateTripFormValues = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  budget: '',
};

const dateField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .refine((v) => v === '' || isValidISODate(v), `${label} must be a real date.`);

/** Syntactic rules for each field (required, length, real dates, positive budget), shared by Create and Edit. */
function tripFields() {
  return z.object({
      name: z
        .string()
        .trim()
        .min(1, 'Trip name is required.')
        .min(TRIP_NAME_MIN, `Trip name must be at least ${TRIP_NAME_MIN} characters.`)
        .max(TRIP_NAME_MAX, `Trip name must be ${TRIP_NAME_MAX} characters or fewer.`),
      destination: z
        .string()
        .trim()
        .min(1, 'Destination is required.')
        .max(120, 'Keep the destination under 120 characters.'),
      startDate: dateField('Start date'),
      endDate: dateField('End date'),
      budget: z
        .string()
        .min(1, 'Budget is required.')
        .refine((v) => v === '' || parseDollarsToCents(v) !== null, 'Enter an amount like 1500 or 1500.50.')
        .refine((v) => parseDollarsToCents(v) !== 0, 'Budget must be greater than $0.')
        .refine(
          (v) => {
            const cents = parseDollarsToCents(v);
            return cents === null || cents <= MAX_BUDGET_DOLLARS * 100;
          },
          `Budget can't exceed $${MAX_BUDGET_DOLLARS.toLocaleString('en-US')}.`,
        ),
    });
}

const endNotBeforeStart = (v: CreateTripFormValues) =>
  !(isValidISODate(v.startDate) && isValidISODate(v.endDate) && v.endDate < v.startDate);
const END_BEFORE_START = { message: "End date can't be before the start date.", path: ['endDate'] };

/**
 * Semantic rules relate fields to each other or to "today" and are only checked
 * once the dates involved are well-formed.
 */
function createTripSchema(today: string) {
  return tripFields()
    .refine((v) => !(isValidISODate(v.startDate) && v.startDate < today), {
      message: "Start date can't be in the past.",
      path: ['startDate'],
    })
    .refine(endNotBeforeStart, END_BEFORE_START);
}

/** The cleaned-up trip from values that passed a schema. */
function toNewTrip(data: CreateTripFormValues): NewTrip {
  return {
    name: data.name,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    budgetCents: parseDollarsToCents(data.budget) as number, // already proven non-null by the schema
  };
}

/** Validate the form and, if it passes, return the trip ready to save. `today` is injectable for tests. */
export function validateCreateTripForm(
  values: CreateTripFormValues,
  today: string = todayISO(),
): Validation<CreateTripFormValues, NewTrip> {
  const input = { ...values, budget: normalizeDollarInput(values.budget) };
  const result = createTripSchema(today).safeParse(input);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  return { ok: true, data: toNewTrip(result.data) };
}

/** The Edit Trip form filled in from a saved trip. A budget of 0 ("none set", from older trips) starts empty. */
export function tripToFormValues(trip: Trip): CreateTripFormValues {
  const { budgetCents } = trip;
  return {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    budget: budgetCents <= 0 ? '' : budgetCents % 100 === 0 ? String(budgetCents / 100) : (budgetCents / 100).toFixed(2),
  };
}

export interface EditTripFormContext {
  /** The trip as saved, before this edit. */
  original: Trip;
  /** The day (YYYY-MM-DD) of every activity on the itinerary. */
  activityDays: string[];
}

const activities = (count: number) => (count === 1 ? '1 activity is' : `${count} activities are`);

/**
 * Edit Trip uses the same field rules as Create, plus:
 *   * the start date may stay in the past if it isn't changed (a trip that has begun can still be edited);
 *   * the dates must still cover every planned activity (the database checks this too).
 */
function editTripSchema(today: string, { original, activityDays }: EditTripFormContext) {
  return tripFields()
    .refine((v) => !(isValidISODate(v.startDate) && v.startDate < today && v.startDate !== original.startDate), {
      message: "Start date can't be in the past.",
      path: ['startDate'],
    })
    .refine(endNotBeforeStart, END_BEFORE_START)
    .superRefine((v, ctx) => {
      if (!isValidISODate(v.startDate) || !isValidISODate(v.endDate) || v.endDate < v.startDate) return;
      const before = activityDays.filter((day) => day < v.startDate).length;
      const after = activityDays.filter((day) => day > v.endDate).length;
      if (before > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: `${activities(before)} planned before this date. Move or delete them first.`,
        });
      }
      if (after > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: `${activities(after)} planned after this date. Move or delete them first.`,
        });
      }
    });
}

/** Validate an edit to a saved trip and, if it passes, return the changes to save. `today` is injectable for tests. */
export function validateEditTripForm(
  values: CreateTripFormValues,
  context: EditTripFormContext,
  today: string = todayISO(),
): Validation<CreateTripFormValues, NewTrip> {
  const input = { ...values, budget: normalizeDollarInput(values.budget) };
  const result = editTripSchema(today, context).safeParse(input);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  return { ok: true, data: toNewTrip(result.data) };
}

/** Exactly six letters or digits (case-insensitive: codes are stored upper-case). */
const inviteCodeSchema = z
  .string()
  .min(1, 'Enter an invite code.')
  .regex(/^[A-Z0-9]{6}$/, 'Invite codes are exactly 6 letters and numbers.');

export interface JoinTripFormValues {
  code: string;
}

export const EMPTY_JOIN_TRIP_FORM: JoinTripFormValues = { code: '' };

/** Normalize what the user typed ("abc-234" → "ABC234") and check it has the shape of an invite code. Existence is checked by the service. */
export function validateJoinTripForm(values: JoinTripFormValues): Validation<JoinTripFormValues, string> {
  const result = inviteCodeSchema.safeParse(normalizeInviteCode(values.code));
  if (!result.success) return { ok: false, errors: { code: result.error.issues[0].message } };
  return { ok: true, data: result.data };
}
