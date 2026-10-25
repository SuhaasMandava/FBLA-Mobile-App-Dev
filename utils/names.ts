import { Trip, TripModel } from '../models/TripModel';

/** "Alex Rivera" → "AR", "madonna" → "M"; "?" when there's no name to go on. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (first + last).toUpperCase();
}

/** The stored name, for avatars. */
export function displayNameOf(trip: Trip, userId: string): string | null {
  return trip.members.find((m) => m.userId === userId)?.displayName ?? null;
}

/** "You", the member's name, or "Former member" for someone who has left the trip. */
export function personName(trip: Trip, id: string, me: string | null): string {
  if (id === me) return 'You';
  const member = trip.members.find((m) => m.userId === id);
  return member ? TripModel.memberName(member) : 'Former member';
}
