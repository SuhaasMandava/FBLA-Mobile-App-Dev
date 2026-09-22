import { NewTrip, Trip, TripModel, TripRow } from '../models/TripModel';
import { supabase } from './supabase';

const SELECT = '*, trip_members(user_id)';

export const TripService = {
  /** Trips the user belongs to (RLS should also enforce this server-side). */
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

  async create(trip: NewTrip): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert(TripModel.toRow(trip))
      .select(SELECT)
      .single();
    if (error) throw error;
    return TripModel.fromRow(data as TripRow);
  },

  async update(id: string, patch: Partial<NewTrip>): Promise<Trip> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.destination !== undefined) row.destination = patch.destination;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
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
};
