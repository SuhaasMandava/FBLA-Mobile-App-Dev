import { NewTrip, Trip, TripModel, TripRow } from '../models/TripModel';
import { supabase } from './supabase';

const SELECT = '*, trip_members(user_id)';

export const TripService = {
  /** Trips the user belongs to, via their trip_members row (RLS should also enforce this server-side). */
  async listForUser(userId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_members!inner(user_id)')
      .eq('trip_members.user_id', userId)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return (data as TripRow[]).map(TripModel.fromRow);
  },

  async getById(id: string): Promise<Trip> {
    const { data, error } = await supabase.from('trips').select(SELECT).eq('id', id).single();
    if (error) throw error;
    return TripModel.fromRow(data as TripRow);
  },

  /**
   * Create a trip. `creatorId`, if given, is also inserted into trip_members
   * so the trip shows up for its creator — the trips table itself has no
   * owner column, membership is tracked entirely through trip_members.
   */
  async create(trip: NewTrip, creatorId?: string): Promise<Trip> {
    const { data, error } = await supabase.from('trips').insert(TripModel.toRow(trip)).select('*').single();
    if (error) throw error;
    const row = data as TripRow;

    if (creatorId) {
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({ trip_id: row.id, user_id: creatorId });
      if (memberError) throw memberError;
      row.trip_members = [{ user_id: creatorId }];
    }

    return TripModel.fromRow(row);
  },

  async update(id: string, patch: Partial<NewTrip>): Promise<Trip> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.destination !== undefined) row.destination = patch.destination;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    const { data, error } = await supabase
      .from('trips')
      .update(row)
      .eq('id', id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return TripModel.fromRow(data as TripRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
  },

  async addMember(tripId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId });
    if (error) throw error;
  },

  async removeMember(tripId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
