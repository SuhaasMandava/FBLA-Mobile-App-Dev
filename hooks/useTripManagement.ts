import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Trip, TripModel } from '../models/TripModel';
import { CacheService } from '../services/CacheService';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';
import { useAuth } from './useAuth';
import { useNetwork } from './useNetwork';
import { useTrip } from './useTrip';

/** Which change is running: leaving, deleting, or removing / promoting a member (by id). */
export type TripTask = { kind: 'leave' | 'delete' } | { kind: 'remove' | 'promote'; memberId: string } | null;

const OFFLINE = "You're offline. Connect to the internet to change the trip or its members.";

/**
 * The organizer tools for one trip: leave, delete, remove a member, make someone an
 * organizer. The rules (who may do what) come from TripModel and match the database's
 * (004 and 008); every change is still checked by the server. Callers confirm first.
 */
export function useTripManagement(trip: Trip) {
  const { userId } = useAuth();
  const { online } = useNetwork();
  const { trips, setTrips, upsertTrip } = useTrip();
  const [task, setTask] = useState<TripTask>(null);
  const [error, setError] = useState<string | null>(null);

  /** Runs one change; returns true if it worked, otherwise shows (and announces) why not. */
  const run = async (next: Exclude<TripTask, null>, change: () => Promise<void>): Promise<boolean> => {
    setError(null);
    if (!online) {
      setError(OFFLINE);
      AccessibilityInfo.announceForAccessibility(OFFLINE);
      return false;
    }
    setTask(next);
    try {
      await change();
      return true;
    } catch (e) {
      console.error(`Trip change (${next.kind}) failed`, e);
      const message = getErrorMessage(e);
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return false;
    } finally {
      setTask(null);
    }
  };

  /** Take the trip off this phone: out of the list (another trip becomes active) and out of the saved data. */
  const forget = () => {
    setTrips(trips.filter((t) => t.id !== trip.id));
    if (userId) void CacheService.clearTrip(userId, trip.id);
  };

  return {
    isOrganizer: TripModel.isOrganizer(trip, userId),
    leaveBlockedReason: TripModel.leaveBlockedReason(trip, userId),
    canRemove: (memberId: string) => TripModel.canRemoveMember(trip, userId, memberId),
    canPromote: (memberId: string) => TripModel.canMakeOrganizer(trip, userId, memberId),
    task,
    error,

    leave: () =>
      run({ kind: 'leave' }, async () => {
        if (!userId) throw new Error('Not signed in');
        await TripService.removeMember(trip.id, userId);
        forget();
      }),

    deleteTrip: () =>
      run({ kind: 'delete' }, async () => {
        await TripService.remove(trip.id);
        forget();
      }),

    removeMember: (memberId: string) =>
      run({ kind: 'remove', memberId }, async () => {
        await TripService.removeMember(trip.id, memberId);
        upsertTrip(TripModel.withoutMember(trip, memberId));
      }),

    makeOrganizer: (memberId: string) =>
      run({ kind: 'promote', memberId }, async () => {
        await TripService.makeOrganizer(trip.id, memberId);
        upsertTrip(TripModel.withOrganizer(trip, memberId));
      }),
  };
}
