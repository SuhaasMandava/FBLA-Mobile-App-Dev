import { Trip, TripModel } from './TripModel';

/**
 * Domain shape of an expense plus the mapping to/from the Supabase `expenses` row.
 * Money is always stored as integer cents to avoid floating-point drift.
 * Pure data: no React, no network.
 */
export const EXPENSE_CATEGORIES = ['lodging', 'food', 'transport', 'activities', 'shopping', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  lodging: 'Lodging',
  food: 'Food',
  transport: 'Transport',
  activities: 'Activities',
  shopping: 'Shopping',
  other: 'Other',
};

export interface Expense {
  id: string;
  tripId: string;
  paidBy: string; // user id
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  /** Per-member owed amounts in cents, keyed by user id. Sums to amountCents. */
  splits: Record<string, number>;
  /** The weights it was split by, or null when it was split evenly among the keys of `splits`. */
  shares: Record<string, number> | null;
  createdAt: string; // ISO timestamp
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount_cents: number;
  category: string | null;
  splits: Record<string, number> | null;
  shares: Record<string, number> | null;
  created_at: string;
}

/** What the form supplies; the id, trip and timestamp are assigned on save. */
export type NewExpense = Omit<Expense, 'id' | 'tripId' | 'createdAt'>;

const isCategory = (value: unknown): value is ExpenseCategory =>
  typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value);

export const ExpenseModel = {
  fromRow(row: ExpenseRow): Expense {
    return {
      id: row.id,
      tripId: row.trip_id,
      paidBy: row.paid_by,
      description: row.description,
      amountCents: row.amount_cents,
      category: isCategory(row.category) ? row.category : 'other',
      splits: row.splits ?? {},
      shares: row.shares ?? null,
      createdAt: row.created_at,
    };
  },

  toInsertRow(tripId: string, expense: NewExpense) {
    return { trip_id: tripId, ...ExpenseModel.toUpdateRow(expense) };
  },

  toUpdateRow(expense: NewExpense) {
    return {
      paid_by: expense.paidBy,
      description: expense.description,
      amount_cents: expense.amountCents,
      category: expense.category,
      splits: expense.splits,
      shares: expense.shares,
    };
  },

  /** Newest first, matching the order the list shows. */
  sort(expenses: Expense[]): Expense[] {
    return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  },

  /** Only whoever paid, or a trip organizer, may change or delete an expense (the database enforces the same). */
  canEdit(expense: Expense, trip: Trip, userId: string | null): boolean {
    return userId !== null && (expense.paidBy === userId || TripModel.isOrganizer(trip, userId));
  },

  /** How many people share the cost. */
  splitCount(expense: Expense): number {
    return Object.values(expense.splits).filter((cents) => cents > 0).length;
  },
};
