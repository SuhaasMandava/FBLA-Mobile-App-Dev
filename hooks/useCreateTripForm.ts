import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { CreateTripFormValues, EMPTY_CREATE_TRIP_FORM, validateCreateTripForm } from '../models/TripForm';
import { NewTrip, Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { createResolver } from '../utils/formResolver';
import { useTrip } from './useTrip';

/** Form state and submit logic for the Create Trip screen. `onCreated` runs once the trip is saved. */
export function useCreateTripForm(onCreated: (trip: Trip) => void) {
  const { upsertTrip } = useTrip();
  const form = useForm<CreateTripFormValues, unknown, NewTrip>({
    defaultValues: EMPTY_CREATE_TRIP_FORM,
    resolver: createResolver((values) => validateCreateTripForm(values)),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = form.handleSubmit(
    async (newTrip) => {
      setSubmitError(null);
      try {
        const trip = await TripService.createTrip(newTrip);
        upsertTrip(trip);
        onCreated(trip);
      } catch (e) {
        console.error('Creating trip failed', e);
        const message = getErrorMessage(e);
        setSubmitError(message);
        AccessibilityInfo.announceForAccessibility(message);
      }
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      if (first) AccessibilityInfo.announceForAccessibility(first);
    },
  );

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError };
}
