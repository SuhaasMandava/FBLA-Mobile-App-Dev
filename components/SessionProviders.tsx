import { ReactNode } from 'react';
import { ChatProvider } from '../context/ChatContext';
import { ChecklistProvider } from '../context/ChecklistContext';
import { CommunicationProvider } from '../context/CommunicationContext';
import { ExpenseProvider } from '../context/ExpenseContext';
import { ItineraryProvider } from '../context/ItineraryContext';
import { TripProvider } from '../context/TripContext';
import { useActivityReminders } from '../hooks/useActivityReminders';
import { useAuth } from '../hooks/useAuth';
import { useTrip } from '../hooks/useTrip';

/** Keeps the active trip's activity reminders scheduled. Renders nothing. */
function ActivityReminders() {
  useActivityReminders();
  return null;
}

/**
 * The itinerary, expenses, checklist and messages belong to the active trip. Each provider resets its own
 * data when the trip changes (see PerTripProvider); the screens inside stay mounted.
 */
function ActiveTripData({ children }: { children: ReactNode }) {
  const { activeTripId } = useTrip();
  return (
    <ItineraryProvider tripId={activeTripId}>
      <ExpenseProvider tripId={activeTripId}>
        <ChecklistProvider tripId={activeTripId}>
          <CommunicationProvider tripId={activeTripId}>
            <ChatProvider tripId={activeTripId}>
              <ActivityReminders />
              {children}
            </ChatProvider>
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
