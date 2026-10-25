import { PostgrestError } from '@supabase/supabase-js';
import { NewSettlement, Settlement, SettlementModel, SettlementRow } from '../models/SettlementModel';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const INSUFFICIENT_PRIVILEGE = '42501';
const NOT_INVOLVED = 'Only the two people involved, or the trip organizer, can do that.';

/** Settlement writes fail with a trigger message or a Row Level Security code (see 010_settlements.sql); turn those into plain language. */
function toSettlementError(error: PostgrestError): unknown {
  if (error.message.includes('settlement_member_not_on_trip')) {
    return new TripServiceError('invalid_split', 'Both people have to be on the trip. Refresh and try again.');
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) return new TripServiceError('not_permitted', NOT_INVOLVED);
  return error;
}

export const SettlementService = {
  /** Every recorded payment on a trip, newest first. Any member may read them. */
  async listByTrip(tripId: string): Promise<Settlement[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return SettlementModel.sort((data as SettlementRow[]).map(SettlementModel.fromRow));
  },

  /** Record that `fromUser` paid `toUser`. */
  async create(tripId: string, payment: NewSettlement): Promise<Settlement> {
    const { data, error } = await supabase
      .from('settlements')
      .insert(SettlementModel.toInsertRow(tripId, payment))
      .select('*')
      .single();
    if (error) throw toSettlementError(error);
    return SettlementModel.fromRow(data as SettlementRow);
  },

  /** Undo a recorded payment. */
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('settlements').delete().eq('id', id).select('id');
    if (error) throw toSettlementError(error);
    if (!data || data.length === 0) throw new TripServiceError('not_permitted', NOT_INVOLVED);
  },
};
