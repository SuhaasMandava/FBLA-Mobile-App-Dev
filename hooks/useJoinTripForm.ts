import { useCallback, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { validateJoinCode } from '../models/TripForm';
import { Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { useAuth } from './useAuth';
import { useTrip } from './useTrip';

/** State and submit logic for the Join Trip screen. */
export function useJoinTripForm() {
  const { userId } = useAuth();
  const { upsertTrip } = useTrip();
  const [code, setCodeState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setCode = useCallback((text: string) => {
    setCodeState(text);
    setError(null); // a stale "not found" shouldn't linger once they edit the code
  }, []);

  /** Validate the code, join the trip, and return it; returns null (with the error set) if anything fails. */
  const submit = useCallback(async (): Promise<Trip | null> => {
    if (submitting) return null;

    const result = validateJoinCode(code);
    if (!result.ok) {
      setError(result.error);
      AccessibilityInfo.announceForAccessibility(result.error);
      return null;
    }
    if (!userId) {
      setError("You're not signed in yet. Please try again in a moment.");
      return null;
    }

    setSubmitting(true);
    setError(null);
    try {
      const trip = await TripService.joinByInviteCode(result.code, userId);
      upsertTrip(trip);
      return trip;
    } catch (e) {
      console.error('Joining trip failed', e);
      const message = getErrorMessage(e);
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [submitting, code, userId, upsertTrip]);

  return { code, error, submitting, setCode, submit };
}
