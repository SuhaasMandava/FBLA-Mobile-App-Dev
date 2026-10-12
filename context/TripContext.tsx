import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { Trip } from '../models/TripModel';
import { CacheService } from '../services/CacheService';
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
  /** Why loading trips failed, if it did. Saved trips are still shown alongside it. */
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

/** What's saved on the device so the trips (and which one was open) are there without a connection. */
interface TripCache {
  trips: Trip[];
  activeTripId: string | null;
}
const CACHE_NAME = 'trips';

type LoadResult = { trips: Trip[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchTrips(userId: string): Promise<LoadResult> {
  try {
    return { trips: await TripService.getMyTrips(userId) };
  } catch (e) {
    console.error('Loading trips failed', e);
    return { error: getErrorMessage(e) };
  }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const { userId, status: authStatus } = useAuth();
  const { onReconnect } = useNetwork();
  const [trips, setTripsState] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  // Starts true so the first render shows "loading", not a flash of "no trips".
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy

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

  const applyCache = useCallback((cached: TripCache | null) => {
    if (cached && !gotFreshData.current) {
      setTripsState(cached.trips);
      setActiveTripId(
        cached.trips.some((t) => t.id === cached.activeTripId) ? cached.activeTripId : (cached.trips[0]?.id ?? null),
      );
    }
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback(
    (result: LoadResult) => {
      if ('trips' in result) {
        gotFreshData.current = true;
        setTrips(result.trips);
        setFetchError(null);
      } else {
        setFetchError(result.error); // keep showing the saved trips
      }
      setFetching(false);
    },
    [setTrips],
  );

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!userId) return;
    void CacheService.read<TripCache>(userId, CACHE_NAME).then(applyCache);
    void fetchTrips(userId).then(applyLoadResult);
  }, [userId, applyCache, applyLoadResult]);

  // Keep the saved copy current (and remember which trip was open). Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (userId && hydrated) void CacheService.write(userId, CACHE_NAME, { trips, activeTripId } satisfies TripCache);
  }, [userId, hydrated, trips, activeTripId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    setFetchError(null);
    applyLoadResult(await fetchTrips(userId));
  }, [userId, applyLoadResult]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

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
