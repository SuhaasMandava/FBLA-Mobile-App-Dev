import { PostgrestError } from '@supabase/supabase-js';
import { ChecklistItem, ChecklistItemRow, ChecklistModel, NewChecklistItem } from '../models/ChecklistModel';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const INSUFFICIENT_PRIVILEGE = '42501';
const GONE = 'That item was removed, so it can no longer be changed.';

/** Checklist writes fail with a trigger message or a Row Level Security code (see 006_checklist.sql); turn those into plain language. */
function toChecklistError(error: PostgrestError): unknown {
  if (error.message.includes('assignee_not_member')) {
    return new TripServiceError('invalid_assignee', 'That person is no longer on the trip. Refresh and pick someone else.');
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) {
    return new TripServiceError('not_permitted', "You're not part of this trip.");
  }
  return error;
}

export const ChecklistService = {
  /** Every checklist item on a trip. Any member may read them. */
  async listByTrip(tripId: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase.from('checklist_items').select('*').eq('trip_id', tripId);
    if (error) throw error;
    return ChecklistModel.sort((data as ChecklistItemRow[]).map(ChecklistModel.fromRow));
  },

  /** Add an item. Any member may. */
  async create(tripId: string, item: NewChecklistItem): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert(ChecklistModel.toInsertRow(tripId, item))
      .select('*')
      .single();
    if (error) throw toChecklistError(error);
    return ChecklistModel.fromRow(data as ChecklistItemRow);
  },

  /** Change an item's name, category or assignee. Any member may. */
  async update(id: string, item: NewChecklistItem): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .update(ChecklistModel.toUpdateRow(item))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw toChecklistError(error);
    if (!data) throw new TripServiceError('checklist_item_not_found', GONE);
    return ChecklistModel.fromRow(data as ChecklistItemRow);
  },

  /** Tick an item off or reopen it. The database records who did it and when. */
  async setDone(id: string, done: boolean): Promise<ChecklistItem> {
    const { data, error } = await supabase.from('checklist_items').update({ done }).eq('id', id).select('*').maybeSingle();
    if (error) throw toChecklistError(error);
    if (!data) throw new TripServiceError('checklist_item_not_found', GONE);
    return ChecklistModel.fromRow(data as ChecklistItemRow);
  },

  /** Delete an item. Only whoever added it, or a trip organizer, may. */
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('checklist_items').delete().eq('id', id).select('id');
    if (error) throw toChecklistError(error);
    if (!data || data.length === 0) {
      throw new TripServiceError(
        'not_permitted',
        'That item is already gone, or only whoever added it or the trip organizer can delete it.',
      );
    }
  },
};
