import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveSync } from '../hooks/useLiveSync';
import { useNetwork } from '../hooks/useNetwork';
import { ItineraryItem, ItineraryItemRow, ItineraryModel, NewItineraryItem } from '../models/ItineraryModel';
import { applyLiveChange, LiveChange } from '../models/LiveChange';
import { CacheService } from '../services/CacheService';
import { getErrorMessage } from '../services/errors';
import { TripService } from '../services/TripService';

/** Outcome of a change: it worked, or here's what to tell the user. Mutations never throw. */
export type MutationResult = { ok: true } | { ok: false; error: string };

export interface ItineraryContextValue {
  /** Activities of the active trip, in day-then-position order. */
  items: ItineraryItem[];
  /** True while the first load for this trip is running or a refresh is in progress. */
  loading: boolean;
  /** Why loading failed, if it did. Saved activities are still shown alongside it. */
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: NewItineraryItem) => Promise<MutationResult>;
  /** Changing `day` puts the activity at the end of the new day. */
  updateItem: (id: string, patch: Partial<NewItineraryItem>) => Promise<MutationResult>;
  deleteItem: (id: string) => Promise<MutationResult>;
  /** Move an activity one step earlier (-1) or later (+1) within its day. */
  moveItem: (id: string, direction: -1 | 1) => Promise<MutationResult>;
}

export const ItineraryContext = createContext<ItineraryContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };

function failure(what: string, error: unknown): MutationResult {
  console.error(what, error);
  return { ok: false, error: getErrorMessage(error) };
}

type LoadResult = { items: ItineraryItem[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchItems(tripId: string): Promise<LoadResult> {
  try {
    return { items: await TripService.getItineraryItems(tripId) };
  } catch (e) {
    console.error('Loading itinerary failed', e);
    return { error: getErrorMessage(e) };
  }
}

/**
 * The active trip's itinerary. Mounted once per trip (the parent keys it on the
 * trip id), so switching trips starts from a clean slate instead of showing the
 * previous trip's activities.
 */
export function ItineraryProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  const { userId } = useAuth();
  const { onReconnect } = useNetwork();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const cacheName = `itinerary:${tripId}`;

  const applyCache = useCallback((cached: ItineraryItem[] | null) => {
    if (cached && !gotFreshData.current) setItems(ItineraryModel.sort(cached));
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult) => {
    if ('items' in result) {
      gotFreshData.current = true;
      setItems(result.items);
      setError(null);
    } else {
      setError(result.error); // keep showing the saved activities
    }
    setLoading(false);
  }, []);

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!tripId || !userId) return;
    void CacheService.read<ItineraryItem[]>(userId, cacheName).then(applyCache);
    void fetchItems(tripId).then(applyLoadResult);
  }, [tripId, userId, cacheName, applyCache, applyLoadResult]);

  // Keep the saved copy current (including after adds, edits, deletes and reorders).
  // Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (tripId && userId && hydrated) void CacheService.write(userId, cacheName, items);
  }, [tripId, userId, hydrated, cacheName, items]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    applyLoadResult(await fetchItems(tripId));
  }, [tripId, applyLoadResult]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

  // Changes from other phones arrive live; a quiet reload covers anything missed.
  const resync = useCallback(async () => {
    if (tripId) applyLoadResult(await fetchItems(tripId));
  }, [tripId, applyLoadResult]);
  useLiveSync({
    tripId,
    tables: [
      {
        table: 'itinerary_items',
        onChange: (change: LiveChange<ItineraryItemRow>) =>
          setItems((current) => applyLiveChange(current, change, ItineraryModel.fromRow, ItineraryModel.sort)),
      },
    ],
    onResync: () => void resync(),
  });

  const addItem = useCallback(
    async (input: NewItineraryItem): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      try {
        const created = await TripService.addItineraryItem(tripId, input, ItineraryModel.nextSortOrder(items, input.day));
        setItems((current) => ItineraryModel.sort([...current, created]));
        return OK;
      } catch (e) {
        return failure('Adding activity failed', e);
      }
    },
    [tripId, items],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<NewItineraryItem>): Promise<MutationResult> => {
      const existing = items.find((i) => i.id === id);
      const movedDay = patch.day !== undefined && existing !== undefined && patch.day !== existing.day;
      try {
        const updated = await TripService.updateItineraryItem(
          id,
          patch,
          movedDay ? ItineraryModel.nextSortOrder(items, patch.day as string) : undefined,
        );
        setItems((current) => ItineraryModel.sort(current.map((i) => (i.id === id ? updated : i))));
        return OK;
      } catch (e) {
        return failure('Updating activity failed', e);
      }
    },
    [items],
  );

  const deleteItem = useCallback(async (id: string): Promise<MutationResult> => {
    try {
      await TripService.deleteItineraryItem(id);
      setItems((current) => current.filter((i) => i.id !== id));
      return OK;
    } catch (e) {
      return failure('Deleting activity failed', e);
    }
  }, []);

  const moveItem = useCallback(
    async (id: string, direction: -1 | 1): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      const moved = ItineraryModel.move(items, id, direction);
      const target = items.find((i) => i.id === id);
      if (!moved || !target) return OK; // already first/last: nothing to do

      // Show the new order straight away, and put the old one back if saving fails.
      const previous = items;
      setItems(moved);
      try {
        await TripService.reorderItems(
          tripId,
          target.day,
          ItineraryModel.forDay(moved, target.day).map((i) => i.id),
        );
        return OK;
      } catch (e) {
        setItems(previous);
        return failure('Reordering activities failed', e);
      }
    },
    [tripId, items],
  );

  const value = useMemo<ItineraryContextValue>(
    () => ({ items, loading, error, refresh, addItem, updateItem, deleteItem, moveItem }),
    [items, loading, error, refresh, addItem, updateItem, deleteItem, moveItem],
  );

  return <ItineraryContext.Provider value={value}>{children}</ItineraryContext.Provider>;
}
