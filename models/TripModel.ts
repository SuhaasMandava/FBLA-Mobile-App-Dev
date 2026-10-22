import { buildJoinLink } from '../utils/inviteLink';

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

  /**
   * The text people send to invite someone; null if the trip has no invite code. The link
   * opens the Join screen with the code filled in; the code itself works for anyone whose
   * messaging app doesn't make the link tappable.
   */
  inviteMessage(trip: Trip): string | null {
    if (!trip.inviteCode) return null;
    return (
      `Join my trip "${trip.name}" on TripHub! Open ${buildJoinLink(trip.inviteCode)} ` +
      `or tap Join with Code in the app and enter ${trip.inviteCode}.`
    );
  },

  /**
   * A public post about the trip, for social media. Deliberately leaves out the invite
   * code: anyone who saw it could join the trip.
   */
  socialPost(trip: Trip): string {
    return `Planning ${trip.name} in ${trip.destination} with my crew on TripHub. #TogetherWeGo`;
  },

  isOrganizer(trip: Trip, userId: string | null): boolean {
    return userId !== null && trip.members.some((m) => m.userId === userId && m.role === 'organizer');
  },

  /**
   * Why this person can't leave the trip, or null if they can. The same rule the database
   * enforces: every trip keeps at least one organizer.
   */
  leaveBlockedReason(trip: Trip, userId: string | null): string | null {
    if (!TripModel.isOrganizer(trip, userId)) return null;
    if (trip.members.some((m) => m.role === 'organizer' && m.userId !== userId)) return null;
    return trip.members.length === 1
      ? "You're the only one on this trip. Delete the trip instead if you no longer need it."
      : "You're the only organizer. Make someone else an organizer first, or delete the trip.";
  },

  /** An organizer can remove anyone else. (Removing yourself is leaving.) */
  canRemoveMember(trip: Trip, actorId: string | null, memberId: string): boolean {
    return TripModel.isOrganizer(trip, actorId) && memberId !== actorId && trip.members.some((m) => m.userId === memberId);
  },

  /** An organizer can make any other member an organizer too. */
  canMakeOrganizer(trip: Trip, actorId: string | null, memberId: string): boolean {
    return TripModel.isOrganizer(trip, actorId) && trip.members.some((m) => m.userId === memberId && m.role === 'member');
  },

  /** The trip with one member taken off the roster (after they leave or are removed). */
  withoutMember(trip: Trip, memberId: string): Trip {
    return { ...trip, members: trip.members.filter((m) => m.userId !== memberId) };
  },

  /** The trip with a member promoted to organizer. */
  withOrganizer(trip: Trip, memberId: string): Trip {
    return {
      ...trip,
      members: trip.members.map((m) => (m.userId === memberId ? { ...m, role: 'organizer' as const } : m)),
    };
  },
};
