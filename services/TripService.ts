import { getRandomBytes } from 'expo-crypto';
import { MemberRole, NewTrip, Trip, TripModel, TripRow } from '../models/TripModel';
import { generateInviteCode } from '../utils/inviteCode';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const SELECT = '*, trip_members(user_id)';
const UNIQUE_VIOLATION = '23505';
const MAX_INVITE_ATTEMPTS = 5;

export const TripService = {
  /**
   * Trips the user belongs to, each with its full member list.
   * Two queries on purpose: filtering the embedded `trip_members` by user in
   * one query would also trim each trip's member list down to just that user.
   */
  async listForUser(userId: string): Promise<Trip[]> {
    const { data: memberships, error: membershipError } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId);
    if (membershipError) throw membershipError;

    const tripIds = (memberships ?? []).map((m) => m.trip_id as string);
    if (tripIds.length === 0) return [];

    const { data, error } = await supabase
      .from('trips')
      .select(SELECT)
      .in('id', tripIds)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return (data as TripRow[]).map(TripModel.fromRow);
  },

  async getById(id: string): Promise<Trip> {
    const { data, error } = await supabase.from('trips').select(SELECT).eq('id', id).single();
    if (error) throw error;
    return TripModel.fromRow(data as TripRow);
  },

  /**
   * Create a trip with a fresh invite code and record `creatorId` as its
   * organizer. Membership lives in trip_members (the trips table has no owner
   * column), so the trip is only usable once that row exists; if it can't be
   * written, the trip is removed again rather than left orphaned.
   */
  async create(input: NewTrip, creatorId: string): Promise<Trip> {
    for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
      const inviteCode = generateInviteCode(getRandomBytes);
      const { data, error } = await supabase
        .from('trips')
        .insert(TripModel.toRow(input, inviteCode))
        .select('*')
        .single();

      // invite_code is the only unique column we set, so a unique violation means a code collision: draw another.
      if (error?.code === UNIQUE_VIOLATION) continue;
      if (error) throw error;

      const row = data as TripRow;
      try {
        await TripService.addMember(row.id, creatorId, 'organizer');
      } catch (memberError) {
        await supabase.from('trips').delete().eq('id', row.id); // best-effort cleanup
        throw memberError;
      }
      return TripModel.fromRow({ ...row, trip_members: [{ user_id: creatorId }] });
    }
    throw new TripServiceError('invite_generation_failed', "Couldn't create an invite code. Please try again.");
  },

  /** Join the trip with this (already normalized) invite code as a regular member. */
  async joinByInviteCode(code: string, userId: string): Promise<Trip> {
    const { data, error } = await supabase.from('trips').select(SELECT).eq('invite_code', code).maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new TripServiceError('invite_not_found', 'No trip matches that invite code. Check it and try again.');
    }

    const row = data as TripRow;
    const members = row.trip_members ?? [];
    if (members.some((m) => m.user_id === userId)) {
      throw new TripServiceError('already_member', "You're already part of this trip.");
    }

    await TripService.addMember(row.id, userId, 'member');
    return TripModel.fromRow({ ...row, trip_members: [...members, { user_id: userId }] });
  },

  async update(id: string, patch: Partial<NewTrip>): Promise<Trip> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.destination !== undefined) row.destination = patch.destination;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.budgetCents !== undefined) row.budget_cents = patch.budgetCents;
    const { data, error } = await supabase
      .from('trips')
      .update(row)
      .eq('id', id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return TripModel.fromRow(data as TripRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
  },

  async addMember(tripId: string, userId: string, role: MemberRole = 'member'): Promise<void> {
    const { error } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId, role });
    if (error?.code === UNIQUE_VIOLATION) {
      throw new TripServiceError('already_member', "You're already part of this trip.");
    }
    if (error) throw error;
  },

  async removeMember(tripId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
