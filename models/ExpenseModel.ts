/**
 * Domain shape of an expense plus the mapping to/from the Supabase `expenses` row.
 * Money is always stored as integer cents to avoid floating-point drift.
 */
export interface Expense {
  id: string;
  tripId: string;
  paidBy: string; // user id
  description: string;
  amountCents: number;
  /** Per-member owed amounts in cents, keyed by user id. Sums to amountCents. */
  splits: Record<string, number>;
  createdAt: string; // ISO timestamp
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount_cents: number;
  splits: Record<string, number>;
  created_at: string;
}

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>;

export const ExpenseModel = {
  fromRow(row: ExpenseRow): Expense {
    return {
      id: row.id,
      tripId: row.trip_id,
      paidBy: row.paid_by,
      description: row.description,
      amountCents: row.amount_cents,
      splits: row.splits ?? {},
      createdAt: row.created_at,
    };
  },

  toRow(expense: NewExpense): Omit<ExpenseRow, 'id' | 'created_at'> {
    return {
      trip_id: expense.tripId,
      paid_by: expense.paidBy,
      description: expense.description,
      amount_cents: expense.amountCents,
      splits: expense.splits,
    };
  },
};
