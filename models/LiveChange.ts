/**
 * One change pushed by the server while a list is open: a row was added or edited
 * (`upsert`, with the new row), or a row was deleted (`delete`, with only its id).
 * Pure data: no React, no network.
 */
export type LiveChange<Row> = { type: 'upsert'; row: Row } | { type: 'delete'; id: string };

/**
 * The list after applying a pushed change. Adds or replaces the item with the same id
 * (so the echo of your own change is harmless) and keeps the list's order. A delete for
 * an id that isn't in the list returns the same array, so nothing re-renders: deletes
 * arrive for every trip, not just this one.
 */
export function applyLiveChange<T extends { id: string }, Row>(
  items: T[],
  change: LiveChange<Row>,
  fromRow: (row: Row) => T,
  sort: (items: T[]) => T[],
): T[] {
  if (change.type === 'delete') {
    return items.some((i) => i.id === change.id) ? items.filter((i) => i.id !== change.id) : items;
  }
  const next = fromRow(change.row);
  return sort([...items.filter((i) => i.id !== next.id), next]);
}
