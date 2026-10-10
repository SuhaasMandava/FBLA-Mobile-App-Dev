/**
 * Domain shape of a trip plus the mapping to/from the Supabase `trips` row.
 * Pure data: no React, no network.
 */
export type MemberRole = 'organizer' | 'member';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  budgetCents: number; // 0 = no budget set
  /** Shared so others can join. Null only for trips created before invite codes existed. */
  inviteCode: string | null;
  memberIds: string[];
}

/** Row as stored in Supabase (snake_case). `memberIds` comes from a joined `trip_members` select. */
export interface TripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_cents: number;
  invite_code: string | null;
  trip_members?: { user_id: string }[];
}

/** What a caller supplies to create a trip; the id and invite code are assigned on creation. */
export type NewTrip = Omit<Trip, 'id' | 'memberIds' | 'inviteCode'>;

export const TripModel = {
  fromRow(row: TripRow): Trip {
    return {
      id: row.id,
      name: row.name,
      destination: row.destination,
      startDate: row.start_date,
      endDate: row.end_date,
      budgetCents: row.budget_cents ?? 0,
      inviteCode: row.invite_code ?? null,
      memberIds: (row.trip_members ?? []).map((m) => m.user_id),
    };
  },

  toRow(trip: NewTrip, inviteCode: string): Omit<TripRow, 'id' | 'trip_members'> {
    return {
      name: trip.name,
      destination: trip.destination,
      start_date: trip.startDate,
      end_date: trip.endDate,
      budget_cents: trip.budgetCents,
      invite_code: inviteCode,
    };
  },
};
