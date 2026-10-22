import { Trip, TripModel } from './TripModel';

/**
 * Domain shapes for group communication (organizer announcements and comments
 * on itinerary activities), their mapping from the Supabase rows, and the rules
 * for who may post and delete. Pure data: no React, no network.
 */
export interface Announcement {
  id: string;
  tripId: string;
  body: string;
  /** The organizer who posted it; null if their account is gone. */
  createdBy: string | null;
  createdAt: string; // ISO timestamp
}

export interface AnnouncementRow {
  id: string;
  trip_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export interface ActivityComment {
  id: string;
  tripId: string;
  /** The itinerary activity it's about. */
  itemId: string;
  body: string;
  createdBy: string | null;
  createdAt: string; // ISO timestamp
}

export interface ActivityCommentRow {
  id: string;
  trip_id: string;
  item_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

const byNewest = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

export const CommunicationModel = {
  announcementFromRow(row: AnnouncementRow): Announcement {
    return {
      id: row.id,
      tripId: row.trip_id,
      body: row.body,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
    };
  },

  commentFromRow(row: ActivityCommentRow): ActivityComment {
    return {
      id: row.id,
      tripId: row.trip_id,
      itemId: row.item_id,
      body: row.body,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
    };
  },

  /** Newest first: the latest news leads. */
  sortAnnouncements(announcements: Announcement[]): Announcement[] {
    return [...announcements].sort(byNewest);
  },

  /** Oldest first, so a thread reads top to bottom like a conversation. */
  sortComments(comments: ActivityComment[]): ActivityComment[] {
    return [...comments].sort((a, b) => -byNewest(a, b));
  },

  /** One activity's comments, oldest first. */
  commentsFor(comments: ActivityComment[], itemId: string): ActivityComment[] {
    return CommunicationModel.sortComments(comments.filter((c) => c.itemId === itemId));
  },

  /** How many comments each activity has, keyed by activity id (activities without any are left out). */
  commentCounts(comments: ActivityComment[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const c of comments) counts[c.itemId] = (counts[c.itemId] ?? 0) + 1;
    return counts;
  },

  /** The same rule the database enforces: only an organizer posts announcements. */
  canPostAnnouncement(trip: Trip, userId: string | null): boolean {
    return TripModel.isOrganizer(trip, userId);
  },

  /** Any organizer may delete an announcement. */
  canDeleteAnnouncement(trip: Trip, userId: string | null): boolean {
    return TripModel.isOrganizer(trip, userId);
  },

  /** Whoever wrote a comment, or an organizer, may delete it. */
  canDeleteComment(comment: ActivityComment, trip: Trip, userId: string | null): boolean {
    return userId !== null && (comment.createdBy === userId || TripModel.isOrganizer(trip, userId));
  },

  /** "You", the member's name, or "A former member" for someone who has left the trip or deleted their account. */
  authorName(trip: Trip, authorId: string | null, me: string | null): string {
    if (authorId !== null && authorId === me) return 'You';
    const member = authorId ? trip.members.find((m) => m.userId === authorId) : undefined;
    return member ? TripModel.memberName(member) : 'A former member';
  },

  /** The display name to draw initials from, or null for someone no longer on the trip. */
  authorDisplayName(trip: Trip, authorId: string | null): string | null {
    return trip.members.find((m) => m.userId === authorId)?.displayName ?? null;
  },
};
