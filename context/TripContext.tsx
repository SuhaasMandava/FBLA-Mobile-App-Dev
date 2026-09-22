import { createContext, ReactNode, useCallback, useMemo, useState } from 'react';
import { Trip } from '../models/TripModel';

export interface TripContextValue {
  /** Trips the signed-in user belongs to. */
  trips: Trip[];
  activeTripId: string | null;
  /** Derived: the trip matching activeTripId, if any. */
  activeTrip: Trip | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTripId: (id: string | null) => void;
}

export const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTripsState] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Keep activeTripId valid: default to the first trip, clear if it disappears.
  const setTrips = useCallback((next: Trip[]) => {
    setTripsState(next);
    setActiveTripId((current) =>
      current && next.some((t) => t.id === current) ? current : (next[0]?.id ?? null),
    );
  }, []);

  const value = useMemo<TripContextValue>(
    () => ({
      trips,
      activeTripId,
      activeTrip: trips.find((t) => t.id === activeTripId) ?? null,
      setTrips,
      setActiveTripId,
    }),
    [trips, activeTripId, setTrips],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
