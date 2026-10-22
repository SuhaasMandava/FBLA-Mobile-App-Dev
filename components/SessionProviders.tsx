import { ReactNode } from 'react';
import { ChecklistProvider } from '../context/ChecklistContext';
import { CommunicationProvider } from '../context/CommunicationContext';
import { ExpenseProvider } from '../context/ExpenseContext';
import { ItineraryProvider } from '../context/ItineraryContext';
import { TripProvider } from '../context/TripContext';
import { useAuth } from '../hooks/useAuth';
import { useTrip } from '../hooks/useTrip';

/** The itinerary, expenses, checklist and messages belong to the active trip; keying on it resets them whenever the trip changes. */
function ActiveTripData({ children }: { children: ReactNode }) {
  const { activeTripId } = useTrip();
  const key = activeTripId ?? 'no-trip';
  return (
    <ItineraryProvider key={key} tripId={activeTripId}>
      <ExpenseProvider key={key} tripId={activeTripId}>
        <ChecklistProvider key={key} tripId={activeTripId}>
          <CommunicationProvider key={key} tripId={activeTripId}>
            {children}
          </CommunicationProvider>
        </ChecklistProvider>
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
