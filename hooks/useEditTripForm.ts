import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { CreateTripFormValues, tripToFormValues, validateEditTripForm } from '../models/TripForm';
import { NewTrip, Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { createResolver } from '../utils/formResolver';
import { useItinerary } from './useItinerary';
import { useNetwork } from './useNetwork';
import { useTrip } from './useTrip';

/** Form state and submit logic for editing a trip's details (organizers only). `onSaved` runs once the change is saved. */
export function useEditTripForm(trip: Trip, onSaved: () => void) {
  const { upsertTrip } = useTrip();
  const { items } = useItinerary();
  const { online } = useNetwork();
  const activityDays = items.map((i) => i.day);
  const form = useForm<CreateTripFormValues, unknown, NewTrip>({
    defaultValues: tripToFormValues(trip),
    resolver: createResolver((values) => validateEditTripForm(values, { original: trip, activityDays })),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fail = (message: string) => {
    setSubmitError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = form.handleSubmit(
    async (changes) => {
      setSubmitError(null);
      if (!online) {
        fail("You're offline. Trip changes can be saved once you're connected again.");
        return;
      }
      try {
        upsertTrip(await TripService.update(trip.id, changes));
        onSaved();
      } catch (e) {
        console.error('Updating trip failed', e);
        fail(getErrorMessage(e));
      }
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      if (first) AccessibilityInfo.announceForAccessibility(first);
    },
  );

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError };
}
