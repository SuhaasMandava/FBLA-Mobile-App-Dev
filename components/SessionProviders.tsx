import { ReactNode } from 'react';
import { ExpenseProvider } from '../context/ExpenseContext';
import { ItineraryProvider } from '../context/ItineraryContext';
import { TripProvider } from '../context/TripContext';
import { useAuth } from '../hooks/useAuth';
import { useTrip } from '../hooks/useTrip';

/** The itinerary and expenses belong to the active trip; keying on it resets both whenever the trip changes. */
function ActiveTripData({ children }: { children: ReactNode }) {
  const { activeTripId } = useTrip();
  const key = activeTripId ?? 'no-trip';
  return (
    <ItineraryProvider key={key} tripId={activeTripId}>
      <ExpenseProvider key={key} tripId={activeTripId}>
        {children}
      </ExpenseProvider>
    </ItineraryProvider>
  );
}

/**
 * Everything that holds a signed-in user's data lives under here. Keying on the
 * user id throws that state away on sign-out or when someone else signs in, so
 * one person's trips can never show up for another.
 */
export function SessionProviders({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return (
    <TripProvider key={userId ?? 'signed-out'}>
      <ActiveTripData>{children}</ActiveTripData>
    </TripProvider>
  );
}
