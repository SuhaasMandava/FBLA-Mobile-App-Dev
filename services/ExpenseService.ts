import { PostgrestError } from '@supabase/supabase-js';
import { Expense, ExpenseModel, ExpenseRow, NewExpense } from '../models/ExpenseModel';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const INSUFFICIENT_PRIVILEGE = '42501';
const NOT_PAYER = 'Only whoever paid, or the trip organizer, can change this expense.';

/** Expense writes fail with a trigger message or a Row Level Security code (see 005_expenses.sql); turn those into plain language. */
function toExpenseError(error: PostgrestError): unknown {
  if (error.message.includes('payer_not_member')) {
    return new TripServiceError('invalid_split', 'Whoever paid has to be on the trip.');
  }
  if (error.message.includes('split_member_not_on_trip')) {
    return new TripServiceError('invalid_split', 'Someone in the split has left the trip. Refresh and try again.');
  }
  if (error.message.includes('splits_total_mismatch') || error.message.includes('invalid_splits')) {
    return new TripServiceError('invalid_split', "The split doesn't add up to the amount. Check it and try again.");
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) {
    return new TripServiceError('not_permitted', 'You can only add or change expenses you paid for. The trip organizer can do it for anyone.');
  }
  return error;
}

export const ExpenseService = {
  /** Every expense on a trip, newest first. Any member may read them. */
  async listByTrip(tripId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ExpenseModel.sort((data as ExpenseRow[]).map(ExpenseModel.fromRow));
  },

  /** Log an expense. You can log what you paid; an organizer can log it for anyone. */
  async create(tripId: string, expense: NewExpense): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(ExpenseModel.toInsertRow(tripId, expense))
      .select('*')
      .single();
    if (error) throw toExpenseError(error);
    return ExpenseModel.fromRow(data as ExpenseRow);
  },

  /**
   * Change an expense. Only the payer or an organizer may; the app only offers
   * editing to them, so "no rows" almost always means it was deleted meanwhile.
   */
  async update(id: string, expense: NewExpense): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(ExpenseModel.toUpdateRow(expense))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw toExpenseError(error);
    if (!data) throw new TripServiceError('expense_not_found', 'That expense was removed, so it can no longer be changed.');
    return ExpenseModel.fromRow(data as ExpenseRow);
  },

  /** Delete an expense. Only the payer or a trip organizer may. */
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('expenses').delete().eq('id', id).select('id');
    if (error) throw toExpenseError(error);
    if (!data || data.length === 0) throw new TripServiceError('not_permitted', NOT_PAYER);
  },
};
