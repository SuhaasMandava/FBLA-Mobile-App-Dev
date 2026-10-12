import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Trip } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';

export interface TripContextValue {
  /** Trips the signed-in user belongs to, soonest first. */
  trips: Trip[];
  activeTripId: string | null;
  /** Derived: the trip matching activeTripId, if any. */
  activeTrip: Trip | null;
  /** True while restoring the saved session or loading trips. */
  loading: boolean;
  /** Why loading trips failed, if it did. */
  error: string | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTripId: (id: string | null) => void;
  /** Reload the user's trips from Supabase. */
  refresh: () => Promise<void>;
  /** Add a trip the user just created or joined (replacing any copy of it) and make it the active trip. */
  upsertTrip: (trip: Trip) => void;
}

export const TripContext = createContext<TripContextValue | undefined>(undefined);

const bySoonestStart = (a: Trip, b: Trip) => a.startDate.localeCompare(b.startDate);

type LoadResult = { trips: Trip[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchTrips(userId: string): Promise<LoadResult> {
  try {
    return { trips: await TripService.listForUser(userId) };
  } catch (e) {
    console.error('Loading trips failed', e);
    return { error: getErrorMessage(e) };
  }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const { userId, status: authStatus } = useAuth();
  const [trips, setTripsState] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  // Starts true so the first render shows "loading", not a flash of "no trips".
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Keep activeTripId valid: default to the first trip, clear if it disappears.
  const setTrips = useCallback((next: Trip[]) => {
    setTripsState(next);
    setActiveTripId((current) =>
      current && next.some((t) => t.id === current) ? current : (next[0]?.id ?? null),
    );
  }, []);

  const upsertTrip = useCallback((trip: Trip) => {
    setTripsState((current) => [...current.filter((t) => t.id !== trip.id), trip].sort(bySoonestStart));
    setActiveTripId(trip.id);
  }, []);

  const applyLoadResult = useCallback(
    (result: LoadResult) => {
      if ('trips' in result) {
        setTrips(result.trips);
        setFetchError(null);
      } else {
        setFetchError(result.error);
      }
      setFetching(false);
    },
    [setTrips],
  );

  useEffect(() => {
    if (userId) void fetchTrips(userId).then(applyLoadResult);
  }, [userId, applyLoadResult]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    setFetchError(null);
    applyLoadResult(await fetchTrips(userId));
  }, [userId, applyLoadResult]);

  const value = useMemo<TripContextValue>(
    () => ({
      trips,
      activeTripId,
      activeTrip: trips.find((t) => t.id === activeTripId) ?? null,
      loading: authStatus === 'loading' || (authStatus === 'signedIn' && fetching),
      error: fetchError,
      setTrips,
      setActiveTripId,
      refresh,
      upsertTrip,
    }),
    [trips, activeTripId, authStatus, fetching, fetchError, setTrips, refresh, upsertTrip],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
