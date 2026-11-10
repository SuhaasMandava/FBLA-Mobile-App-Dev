import { Context, ReactNode, useLayoutEffect, useState } from 'react';

interface StoreProps<T> {
  tripId: string | null;
  useStore: (tripId: string | null) => T;
  onValue: (value: T) => void;
}

/** Runs one trip's data hook and hands its value up. Draws nothing. */
function Store<T>({ tripId, useStore, onValue }: StoreProps<T>) {
  const value = useStore(tripId);
  // A layout effect, so the new value is in place before the screen is painted.
  useLayoutEffect(() => onValue(value), [value, onValue]);
  return null;
}

interface PerTripProviderProps<T> {
  tripId: string | null;
  context: Context<T | undefined>;
  /** The hook that loads and holds one trip's data. Must be the same function on every render. */
  useStore: (tripId: string | null) => T;
  children: ReactNode;
}

/**
 * Provides data that belongs to the active trip. Switching trips throws the old trip's state away
 * (the store is keyed on the trip id, so a late answer for the old trip can never land in the new
 * one) WITHOUT remounting `children`. The screens and the navigator stay mounted, which matters on
 * iOS: rebuilding the navigator while a sheet is open leaves the sheet stuck on screen.
 */
export function PerTripProvider<T>({ tripId, context: TripDataContext, useStore, children }: PerTripProviderProps<T>) {
  const [value, setValue] = useState<T | null>(null);
  return (
    <>
      <Store key={tripId ?? 'no-trip'} tripId={tripId} useStore={useStore} onValue={setValue} />
      {/* Nothing below can render until the first value exists (one frame, before paint). */}
      {value !== null ? <TripDataContext.Provider value={value}>{children}</TripDataContext.Provider> : null}
    </>
  );
}
