import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { EMPTY_JOIN_TRIP_FORM, JoinTripFormValues, validateJoinTripForm } from '../models/TripForm';
import { Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { createResolver } from '../utils/formResolver';
import { useTrip } from './useTrip';

/**
 * Form state and submit logic for the Join Trip screen. `onJoined` runs once the user is on the trip.
 * `initialCode` prefills the box (from a join link); joining still waits for the user to tap Join.
 */
export function useJoinTripForm(onJoined: (trip: Trip) => void, initialCode?: string) {
  const { upsertTrip } = useTrip();
  // `data` handed to submit is the normalized code ("abc-234" → "ABC234").
  const form = useForm<JoinTripFormValues, unknown, string>({
    defaultValues: initialCode ? { code: initialCode } : EMPTY_JOIN_TRIP_FORM,
    resolver: createResolver(validateJoinTripForm),
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(
    async (code) => {
      try {
        const trip = await TripService.joinTripByCode(code);
        upsertTrip(trip);
        onJoined(trip);
      } catch (e) {
        console.error('Joining trip failed', e);
        // Show the problem (unknown code, already a member…) right under the input.
        const message = getErrorMessage(e);
        form.setError('code', { type: 'server', message });
        AccessibilityInfo.announceForAccessibility(message);
      }
    },
    (errors) => {
      const message = errors.code?.message;
      if (message) AccessibilityInfo.announceForAccessibility(message);
    },
  );

  return { control: form.control, submit, submitting: form.formState.isSubmitting };
}
