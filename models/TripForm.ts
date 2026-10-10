import { z } from 'zod';
import { isValidISODate, todayISO } from '../utils/dates';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH, normalizeInviteCode } from '../utils/inviteCode';
import { normalizeDollarInput, parseDollarsToCents } from '../utils/money';
import { NewTrip } from './TripModel';

/** Largest budget we accept: keeps cents safely inside Postgres `integer`. */
export const MAX_BUDGET_DOLLARS = 1_000_000;

/** Raw text from the Create Trip inputs — everything is a string until validated. */
export interface CreateTripFormValues {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
}

export type CreateTripField = keyof CreateTripFormValues;
export type CreateTripErrors = Partial<Record<CreateTripField, string>>;

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
    .refine((v) => v === '' || isValidISODate(v), `${label} must be a real date, like 2026-07-12.`);

/**
 * Syntactic rules live on the fields (required, shape, positive budget);
 * semantic rules relate fields to each other or to "today" and are only
 * checked once the dates involved are well-formed.
 */
function createTripSchema(today: string) {
  return z
    .object({
      name: z.string().trim().min(1, 'Trip name is required.').max(80, 'Keep the trip name under 80 characters.'),
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
    })
    .refine((v) => !(isValidISODate(v.startDate) && v.startDate < today), {
      message: "Start date can't be in the past.",
      path: ['startDate'],
    })
    .refine((v) => !(isValidISODate(v.startDate) && isValidISODate(v.endDate) && v.endDate <= v.startDate), {
      message: 'End date must be after the start date.',
      path: ['endDate'],
    });
}

export type CreateTripValidation = { ok: true; trip: NewTrip } | { ok: false; errors: CreateTripErrors };

/** Validate the form and, if it passes, return the trip ready to save. `today` is injectable for tests. */
export function validateCreateTripForm(values: CreateTripFormValues, today: string = todayISO()): CreateTripValidation {
  const input = { ...values, budget: normalizeDollarInput(values.budget) };
  const result = createTripSchema(today).safeParse(input);

  if (!result.success) {
    const errors: CreateTripErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as CreateTripField | undefined;
      if (field && !errors[field]) errors[field] = issue.message; // first message per field
    }
    return { ok: false, errors };
  }

  const { name, destination, startDate, endDate, budget } = result.data;
  return {
    ok: true,
    trip: {
      name,
      destination,
      startDate,
      endDate,
      budgetCents: parseDollarsToCents(budget) as number, // already proven non-null by the schema
    },
  };
}

const inviteCodeSchema = z
  .string()
  .min(1, 'Enter an invite code.')
  .regex(
    new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`),
    `Invite codes are ${INVITE_CODE_LENGTH} letters and numbers.`,
  );

export type JoinCodeValidation = { ok: true; code: string } | { ok: false; error: string };

/** Normalize what the user typed and check it has the shape of an invite code. Existence is checked by the service. */
export function validateJoinCode(raw: string): JoinCodeValidation {
  const result = inviteCodeSchema.safeParse(normalizeInviteCode(raw));
  if (!result.success) return { ok: false, error: result.error.issues[0].message };
  return { ok: true, code: result.data };
}
