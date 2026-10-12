import { PostgrestError } from '@supabase/supabase-js';
import { getRandomBytes } from 'expo-crypto';
import { ItineraryItem, ItineraryItemRow, ItineraryModel, NewItineraryItem } from '../models/ItineraryModel';
import { NewTrip, Trip, TripModel, TripRow } from '../models/TripModel';
import { generateInviteCode } from '../utils/inviteCode';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const TRIP_SELECT = '*, trip_members(user_id, role, profiles(display_name))';
const UNIQUE_VIOLATION = '23505';
const MAX_INVITE_ATTEMPTS = 5;

const NOT_ORGANIZER = 'Only the trip organizer can do that.';

/** The join function reports its failures by message (see 004_access_control.sql). */
function toJoinError(error: PostgrestError): unknown {
  if (error.message.includes('invite_not_found')) {
    return new TripServiceError('invite_not_found', 'No trip matches that invite code. Check it and try again.');
  }
  if (error.message.includes('already_member') || error.code === UNIQUE_VIOLATION) {
    return new TripServiceError('already_member', "You're already part of this trip.");
  }
  return error;
}

const INSUFFICIENT_PRIVILEGE = '42501';

/** Itinerary writes fail with a database message or a Row Level Security code; turn those into plain language. */
function toItineraryError(error: PostgrestError): unknown {
  if (error.message.includes('day_outside_trip')) {
    return new TripServiceError('day_outside_trip', "That day is outside the trip's dates.");
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) {
    return new TripServiceError('not_permitted', "You're not part of this trip.");
  }
  return error;
}

export const TripService = {
  /**
   * Trips the user belongs to, soonest first, each with its full member list.
   * Two queries on purpose: filtering the embedded `trip_members` by user in
   * one query would also trim each trip's member list down to just that user.
   * (Row Level Security enforces the same boundary on the server.)
   */
  async getMyTrips(userId: string): Promise<Trip[]> {
    const { data: memberships, error: membershipError } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId);
    if (membershipError) throw membershipError;

    const tripIds = (memberships ?? []).map((m) => m.trip_id as string);
    if (tripIds.length === 0) return [];

    const { data, error } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .in('id', tripIds)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return (data as TripRow[]).map(TripModel.fromRow);
  },

  async getTrip(id: string): Promise<Trip> {
    const { data, error } = await supabase.from('trips').select(TRIP_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new TripServiceError('trip_not_found', "That trip doesn't exist or you're not part of it.");
    return TripModel.fromRow(data as TripRow);
  },

  /**
   * Create a trip with a fresh invite code; the signed-in user becomes its
   * organizer. The database function writes the trip and the organizer row in
   * one transaction, so there's never a trip nobody belongs to.
   */
  async createTrip(input: NewTrip): Promise<Trip> {
    for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
      const inviteCode = generateInviteCode(getRandomBytes);
      const { data, error } = await supabase.rpc('create_trip', TripModel.toCreateParams(input, inviteCode));

      // invite_code is the only unique column we set, so a unique violation means a code collision: draw another.
      if (error?.code === UNIQUE_VIOLATION) continue;
      if (error) throw error;
      return TripService.getTrip((data as { id: string }).id);
    }
    throw new TripServiceError('invite_generation_failed', "Couldn't create an invite code. Please try again.");
  },

  /** Join the trip with this (already normalized) invite code as a regular member. */
  async joinTripByCode(code: string): Promise<Trip> {
    const { data, error } = await supabase.rpc('join_trip_by_code', { p_code: code });
    if (error) throw toJoinError(error);
    return TripService.getTrip((data as { id: string }).id);
  },

  /** Organizers only. Row Level Security turns anyone else's edit into "no rows", which we report as a clear error. */
  async update(id: string, patch: Partial<NewTrip>): Promise<Trip> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.destination !== undefined) row.destination = patch.destination;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.budgetCents !== undefined) row.budget_cents = patch.budgetCents;

    const { data, error } = await supabase.from('trips').update(row).eq('id', id).select(TRIP_SELECT).maybeSingle();
    if (error) throw error;
    if (!data) throw new TripServiceError('not_permitted', NOT_ORGANIZER);
    return TripModel.fromRow(data as TripRow);
  },

  /** Organizers only; removes the trip with its members, itinerary and expenses. */
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('trips').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new TripServiceError('not_permitted', NOT_ORGANIZER);
  },

  /** Every activity on a trip, in day-then-position order. */
  async getItineraryItems(tripId: string): Promise<ItineraryItem[]> {
    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day')
      .order('sort_order')
      .order('created_at');
    if (error) throw error;
    return ItineraryModel.sort((data as ItineraryItemRow[]).map(ItineraryModel.fromRow));
  },

  /** Add an activity at `sortOrder` (its position in the day). Any member of the trip may. */
  async addItineraryItem(tripId: string, item: NewItineraryItem, sortOrder: number): Promise<ItineraryItem> {
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(ItineraryModel.toInsertRow(tripId, item, sortOrder))
      .select('*')
      .single();
    if (error) throw toItineraryError(error);
    return ItineraryModel.fromRow(data as ItineraryItemRow);
  },

  /** Change an activity. Pass `sortOrder` when it moves to a different day so it lands at the end of that day. */
  async updateItineraryItem(id: string, patch: Partial<NewItineraryItem>, sortOrder?: number): Promise<ItineraryItem> {
    const row = ItineraryModel.toUpdateRow(patch);
    if (sortOrder !== undefined) row.sort_order = sortOrder;

    const { data, error } = await supabase.from('itinerary_items').update(row).eq('id', id).select('*').maybeSingle();
    if (error) throw toItineraryError(error);
    if (!data) throw new TripServiceError('item_not_found', 'That activity was removed, so it can no longer be changed.');
    return ItineraryModel.fromRow(data as ItineraryItemRow);
  },

  /** Delete an activity. Only whoever added it, or a trip organizer, may. */
  async deleteItineraryItem(id: string): Promise<void> {
    const { data, error } = await supabase.from('itinerary_items').delete().eq('id', id).select('id');
    if (error) throw toItineraryError(error);
    if (!data || data.length === 0) {
      throw new TripServiceError('not_permitted', 'Only whoever added this activity, or the trip organizer, can delete it.');
    }
  },

  /** Save one day's order: `orderedIds` is every activity of that day in the wanted order. Atomic. */
  async reorderItems(tripId: string, day: string, orderedIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_itinerary_items', {
      p_trip_id: tripId,
      p_day: day,
      p_item_ids: orderedIds,
    });
    if (error) throw toItineraryError(error);
  },

  /** Leave a trip (yourself) or, as organizer, remove someone else. */
  async removeMember(tripId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .select('user_id');
    if (error) throw error;
    if (!data || data.length === 0) throw new TripServiceError('not_permitted', NOT_ORGANIZER);
  },
};
