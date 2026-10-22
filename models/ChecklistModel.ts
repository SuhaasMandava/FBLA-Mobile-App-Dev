import { Trip, TripModel } from './TripModel';

/**
 * Domain shape of a shared checklist item plus the mapping to/from the Supabase
 * `checklist_items` row. Pure data: no React, no network.
 */
export const CHECKLIST_CATEGORIES = ['packing', 'todo', 'booking'] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

/** Short names for the category chips on the form. */
export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  packing: 'Packing',
  todo: 'To-do',
  booking: 'Booking',
};

/** Names for the groups on the list. */
export const CHECKLIST_SECTION_TITLES: Record<ChecklistCategory, string> = {
  packing: 'Packing',
  todo: 'To-Do',
  booking: 'Bookings',
};

export interface ChecklistItem {
  id: string;
  tripId: string;
  title: string;
  category: ChecklistCategory;
  /** User id of the member responsible, or null when nobody is. */
  assignedTo: string | null;
  done: boolean;
  /** Who ticked it off and when. Null while open, or if that person's account is gone. */
  completedBy: string | null;
  completedAt: string | null; // ISO timestamp
  createdBy: string | null;
  createdAt: string; // ISO timestamp
}

export interface ChecklistItemRow {
  id: string;
  trip_id: string;
  title: string;
  category: string | null;
  assigned_to: string | null;
  done: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** What the form supplies; everything else is assigned by the database. */
export type NewChecklistItem = Pick<ChecklistItem, 'title' | 'category' | 'assignedTo'>;

export interface ChecklistProgress {
  done: number;
  total: number;
  /** 0 to 1; null when the list is empty. */
  fraction: number | null;
  /** "5 of 12 done", "All 12 done", or "Nothing on the list yet". */
  label: string;
}

const isCategory = (value: unknown): value is ChecklistCategory =>
  typeof value === 'string' && (CHECKLIST_CATEGORIES as readonly string[]).includes(value);

export const ChecklistModel = {
  fromRow(row: ChecklistItemRow): ChecklistItem {
    return {
      id: row.id,
      tripId: row.trip_id,
      title: row.title,
      category: isCategory(row.category) ? row.category : 'todo',
      assignedTo: row.assigned_to ?? null,
      done: row.done,
      completedBy: row.completed_by ?? null,
      completedAt: row.completed_at ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
    };
  },

  toInsertRow(tripId: string, item: NewChecklistItem) {
    return { trip_id: tripId, ...ChecklistModel.toUpdateRow(item) };
  },

  /** Only the columns members may edit; completion is stamped by the database. */
  toUpdateRow(item: NewChecklistItem) {
    return { title: item.title, category: item.category, assigned_to: item.assignedTo };
  },

  /** Oldest first, open items ahead of finished ones. */
  sort(items: ChecklistItem[]): ChecklistItem[] {
    return [...items].sort(
      (a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  },

  /** Non-empty groups in the order the list shows them, each sorted. */
  groupByCategory(items: ChecklistItem[]): { category: ChecklistCategory; items: ChecklistItem[] }[] {
    return CHECKLIST_CATEGORIES.map((category) => ({
      category,
      items: ChecklistModel.sort(items.filter((i) => i.category === category)),
    })).filter((group) => group.items.length > 0);
  },

  progress(items: ChecklistItem[]): ChecklistProgress {
    const total = items.length;
    const done = items.filter((i) => i.done).length;
    if (total === 0) return { done, total, fraction: null, label: 'Nothing on the list yet' };
    return { done, total, fraction: done / total, label: done === total ? `All ${total} done` : `${done} of ${total} done` };
  },

  /** The same rule the database enforces: whoever added an item, or a trip organizer, can delete it. */
  canDelete(item: ChecklistItem, trip: Trip, userId: string | null): boolean {
    return userId !== null && (item.createdBy === userId || TripModel.isOrganizer(trip, userId));
  },

  /** "you", the member's name, or "a former member" for someone who has left the trip (lowercase, for mid-sentence use). */
  whoIs(trip: Trip, id: string, me: string | null): string {
    if (id === me) return 'you';
    const member = trip.members.find((m) => m.userId === id);
    return member ? TripModel.memberName(member) : 'a former member';
  },

  /** "Assigned to Alex", "Done by you", or both: the line under an item's title. */
  detailLine(item: ChecklistItem, trip: Trip, me: string | null): string {
    const parts: string[] = [];
    if (item.done) {
      parts.push(item.completedBy ? `Done by ${ChecklistModel.whoIs(trip, item.completedBy, me)}` : 'Done');
    }
    if (item.assignedTo) parts.push(`Assigned to ${ChecklistModel.whoIs(trip, item.assignedTo, me)}`);
    else if (!item.done) parts.push('Unassigned');
    return parts.join(' · ');
  },
};
