import { ReactNode } from 'react';
import { ItineraryProvider } from '../context/ItineraryContext';
import { TripProvider } from '../context/TripContext';
import { useAuth } from '../hooks/useAuth';
import { useTrip } from '../hooks/useTrip';

/** The itinerary belongs to the active trip; keying on it resets the list whenever the trip changes. */
function ActiveTripItinerary({ children }: { children: ReactNode }) {
  const { activeTripId } = useTrip();
  return (
    <ItineraryProvider key={activeTripId ?? 'no-trip'} tripId={activeTripId}>
      {children}
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
      <ActiveTripItinerary>{children}</ActiveTripItinerary>
    </TripProvider>
  );
}
