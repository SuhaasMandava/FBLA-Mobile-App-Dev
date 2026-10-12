/**
 * Domain shape of a trip plus the mapping to/from the Supabase `trips` row.
 * Pure data: no React, no network.
 */
export type MemberRole = 'organizer' | 'member';

export interface TripMember {
  userId: string;
  role: MemberRole;
  /** Null for people who never set a name (e.g. accounts from before profiles existed). */
  displayName: string | null;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  budgetCents: number; // 0 = no budget set
  /** Shared so others can join. Null only for trips created before invite codes existed. */
  inviteCode: string | null;
  members: TripMember[];
}

/** Row as stored in Supabase (snake_case), with members joined in from `trip_members` and `profiles`. */
export interface TripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_cents: number;
  invite_code: string | null;
  trip_members?: {
    user_id: string;
    role: MemberRole;
    profiles: { display_name: string | null } | null;
  }[];
}

/** What a caller supplies to create a trip; the id, invite code and members are assigned on creation. */
export type NewTrip = Omit<Trip, 'id' | 'inviteCode' | 'members'>;

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
      members: (row.trip_members ?? []).map((m) => ({
        userId: m.user_id,
        role: m.role,
        displayName: m.profiles?.display_name ?? null,
      })),
    };
  },

  /** Arguments for the create_trip database function. */
  toCreateParams(trip: NewTrip, inviteCode: string) {
    return {
      p_name: trip.name,
      p_destination: trip.destination,
      p_start_date: trip.startDate,
      p_end_date: trip.endDate,
      p_budget_cents: trip.budgetCents,
      p_invite_code: inviteCode,
    };
  },

  /** Name to show for a member. */
  memberName(member: TripMember): string {
    return member.displayName ?? 'Trip member';
  },

  isOrganizer(trip: Trip, userId: string | null): boolean {
    return userId !== null && trip.members.some((m) => m.userId === userId && m.role === 'organizer');
  },
};
