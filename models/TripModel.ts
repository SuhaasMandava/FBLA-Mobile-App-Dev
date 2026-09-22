/**
 * Domain shape of a trip plus the mapping to/from the Supabase `trips` row.
 * Pure data: no React, no network.
 */
export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  memberIds: string[];
}

/** Row as stored in Supabase (snake_case). `memberIds` comes from a joined `trip_members` select. */
export interface TripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_members?: { user_id: string }[];
}

export type NewTrip = Omit<Trip, 'id' | 'memberIds'>;

export const TripModel = {
  fromRow(row: TripRow): Trip {
    return {
      id: row.id,
      name: row.name,
      destination: row.destination,
      startDate: row.start_date,
      endDate: row.end_date,
      memberIds: (row.trip_members ?? []).map((m) => m.user_id),
    };
  },

  toRow(trip: NewTrip): Omit<TripRow, 'id' | 'trip_members'> {
    return {
      name: trip.name,
      destination: trip.destination,
      start_date: trip.startDate,
      end_date: trip.endDate,
    };
  },
};
