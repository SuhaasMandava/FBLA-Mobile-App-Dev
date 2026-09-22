import { Expense, ExpenseModel, ExpenseRow, NewExpense } from '../models/ExpenseModel';
import { supabase } from './supabase';

export const ExpenseService = {
  async listByTrip(tripId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ExpenseRow[]).map(ExpenseModel.fromRow);
  },

  async create(expense: NewExpense): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(ExpenseModel.toRow(expense))
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseModel.fromRow(data as ExpenseRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },
};
