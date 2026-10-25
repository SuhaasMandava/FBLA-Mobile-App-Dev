import { Trip, TripModel } from './TripModel';

/**
 * A recorded payment between two members ("Mark as paid") and the mapping to/from the
 * Supabase `settlements` row. Money is integer cents. Pure data: no React, no network.
 */
export interface Settlement {
  id: string;
  tripId: string;
  fromUser: string; // paid
  toUser: string; // was paid
  amountCents: number;
  createdAt: string; // ISO timestamp
}

export interface SettlementRow {
  id: string;
  trip_id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  created_at: string;
}

/** What the screen supplies; the id, trip and timestamp are assigned on save. */
export type NewSettlement = Pick<Settlement, 'fromUser' | 'toUser' | 'amountCents'>;

export const SettlementModel = {
  fromRow(row: SettlementRow): Settlement {
    return {
      id: row.id,
      tripId: row.trip_id,
      fromUser: row.from_user,
      toUser: row.to_user,
      amountCents: row.amount_cents,
      createdAt: row.created_at,
    };
  },

  toInsertRow(tripId: string, payment: NewSettlement) {
    return { trip_id: tripId, from_user: payment.fromUser, to_user: payment.toUser, amount_cents: payment.amountCents };
  },

  /** Newest first, matching the order the list shows. */
  sort(settlements: Settlement[]): Settlement[] {
    return [...settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  },

  /** Only the person who was paid, or a trip organizer, may record a payment, so nobody clears their own debt (the database enforces the same). */
  canRecord(payment: Pick<Settlement, 'toUser'>, trip: Trip, userId: string | null): boolean {
    return userId !== null && (payment.toUser === userId || TripModel.isOrganizer(trip, userId));
  },

  /** Either person in the payment, or a trip organizer, may undo it (the database enforces the same). */
  canManage(payment: Pick<Settlement, 'fromUser' | 'toUser'>, trip: Trip, userId: string | null): boolean {
    return userId !== null && (payment.fromUser === userId || payment.toUser === userId || TripModel.isOrganizer(trip, userId));
  },
};
