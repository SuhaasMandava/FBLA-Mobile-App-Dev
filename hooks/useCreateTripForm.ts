import { useCallback, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  CreateTripErrors,
  CreateTripField,
  CreateTripFormValues,
  EMPTY_CREATE_TRIP_FORM,
  validateCreateTripForm,
} from '../models/TripForm';
import { Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { formatDateInput } from '../utils/dates';
import { useAuth } from './useAuth';
import { useTrip } from './useTrip';

const DATE_FIELDS: CreateTripField[] = ['startDate', 'endDate'];

function errorsOf(values: CreateTripFormValues): CreateTripErrors {
  const result = validateCreateTripForm(values);
  return result.ok ? {} : result.errors;
}

/** State and submit logic for the Create Trip screen. */
export function useCreateTripForm() {
  const { userId } = useAuth();
  const { upsertTrip } = useTrip();
  const [values, setValues] = useState<CreateTripFormValues>(EMPTY_CREATE_TRIP_FORM);
  const [errors, setErrors] = useState<CreateTripErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const setField = useCallback(
    (field: CreateTripField, text: string) => {
      const next = { ...values, [field]: DATE_FIELDS.includes(field) ? formatDateInput(text) : text };
      setValues(next);
      // Once they've tried to submit, keep the messages in step with what they type.
      if (attempted) setErrors(errorsOf(next));
    },
    [values, attempted],
  );

  /** Validate, save, and return the new trip; returns null (with errors set) if anything fails. */
  const submit = useCallback(async (): Promise<Trip | null> => {
    if (submitting) return null;
    setAttempted(true);
    setSubmitError(null);

    const result = validateCreateTripForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.values(result.errors)[0];
      if (first) AccessibilityInfo.announceForAccessibility(first);
      return null;
    }
    setErrors({});

    if (!userId) {
      setSubmitError("You're not signed in yet. Please try again in a moment.");
      return null;
    }

    setSubmitting(true);
    try {
      const trip = await TripService.create(result.trip, userId);
      upsertTrip(trip);
      return trip;
    } catch (e) {
      console.error('Creating trip failed', e);
      const message = getErrorMessage(e);
      setSubmitError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [submitting, values, userId, upsertTrip]);

  return { values, errors, submitError, submitting, setField, submit };
}
