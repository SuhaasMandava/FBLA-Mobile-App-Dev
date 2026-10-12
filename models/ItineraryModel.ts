/**
 * Domain shape of an itinerary activity, its mapping to/from the Supabase
 * `itinerary_items` row, and the pure list logic (grouping, ordering, moving).
 * No React, no network.
 */
export interface ItineraryItem {
  id: string;
  tripId: string;
  day: string; // YYYY-MM-DD
  title: string;
  time: string | null; // 24-hour HH:MM
  location: string | null;
  notes: string | null;
  /** Position within its day, 1 = first. Ties fall back to creation order, so ordering is always stable. */
  sortOrder: number;
  createdBy: string | null;
}

export interface ItineraryItemRow {
  id: string;
  trip_id: string;
  day: string;
  title: string;
  time: string | null; // Postgres returns HH:MM:SS
  location: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at?: string;
}

/** What the form supplies; the id, trip, author and position are assigned on save. */
export type NewItineraryItem = Pick<ItineraryItem, 'day' | 'title' | 'time' | 'location' | 'notes'>;

export interface DayGroup {
  day: string;
  items: ItineraryItem[];
}

export const ItineraryModel = {
  fromRow(row: ItineraryItemRow): ItineraryItem {
    return {
      id: row.id,
      tripId: row.trip_id,
      day: row.day,
      title: row.title,
      time: row.time ? row.time.slice(0, 5) : null,
      location: row.location,
      notes: row.notes,
      sortOrder: row.sort_order,
      createdBy: row.created_by,
    };
  },

  toInsertRow(tripId: string, item: NewItineraryItem, sortOrder: number) {
    return {
      trip_id: tripId,
      day: item.day,
      title: item.title,
      time: item.time,
      location: item.location,
      notes: item.notes,
      sort_order: sortOrder,
    };
  },

  toUpdateRow(patch: Partial<NewItineraryItem>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (patch.day !== undefined) row.day = patch.day;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.time !== undefined) row.time = patch.time;
    if (patch.location !== undefined) row.location = patch.location;
    if (patch.notes !== undefined) row.notes = patch.notes;
    return row;
  },

  /** Day first, then the user's order within the day. */
  compare(a: ItineraryItem, b: ItineraryItem): number {
    return a.day.localeCompare(b.day) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  },

  sort(items: ItineraryItem[]): ItineraryItem[] {
    return [...items].sort(ItineraryModel.compare);
  },

  /** Items for one day, in order. */
  forDay(items: ItineraryItem[], day: string): ItineraryItem[] {
    return ItineraryModel.sort(items.filter((i) => i.day === day));
  },

  /** One group per given day (including empty days), in the order the days are given. */
  groupByDay(items: ItineraryItem[], days: string[]): DayGroup[] {
    return days.map((day) => ({ day, items: ItineraryModel.forDay(items, day) }));
  },

  /** The sort_order a new item at the end of `day` should get. */
  nextSortOrder(items: ItineraryItem[], day: string): number {
    return items.reduce((max, i) => (i.day === day ? Math.max(max, i.sortOrder) : max), 0) + 1;
  },

  /** The next few activities from `today` on, soonest first. */
  upcoming(items: ItineraryItem[], today: string, limit: number): ItineraryItem[] {
    return ItineraryModel.sort(items.filter((i) => i.day >= today)).slice(0, limit);
  },

  /**
   * Move one item a step earlier (-1) or later (+1) within its day.
   * Returns the whole list with that day renumbered 1..n, or null if it can't move.
   */
  move(items: ItineraryItem[], itemId: string, direction: -1 | 1): ItineraryItem[] | null {
    const target = items.find((i) => i.id === itemId);
    if (!target) return null;

    const dayItems = ItineraryModel.forDay(items, target.day);
    const from = dayItems.findIndex((i) => i.id === itemId);
    const to = from + direction;
    if (to < 0 || to >= dayItems.length) return null;

    const reordered = [...dayItems];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    const renumbered = new Map(reordered.map((item, index) => [item.id, index + 1]));
    return items.map((i) => (renumbered.has(i.id) ? { ...i, sortOrder: renumbered.get(i.id) as number } : i));
  },
};
