import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { ChecklistItem, ChecklistModel, NewChecklistItem } from '../models/ChecklistModel';
import { CacheService } from '../services/CacheService';
import { ChecklistService } from '../services/ChecklistService';
import { getErrorMessage } from '../services/errors';
import { MutationResult } from './ItineraryContext';

export interface ChecklistContextValue {
  /** Checklist items of the active trip, oldest first with open items ahead of finished ones. */
  items: ChecklistItem[];
  /** True while the first load for this trip is running or a refresh is in progress. */
  loading: boolean;
  /** Why loading failed, if it did. Saved items are still shown alongside it. */
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: NewChecklistItem) => Promise<MutationResult>;
  updateItem: (id: string, item: NewChecklistItem) => Promise<MutationResult>;
  /** Tick an item off or reopen it. Shows the change at once and puts it back if it can't be saved. */
  setDone: (id: string, done: boolean) => Promise<MutationResult>;
  deleteItem: (id: string) => Promise<MutationResult>;
}

export const ChecklistContext = createContext<ChecklistContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };
/** Writes need the server; say so up front instead of waiting for the request to time out. */
const OFFLINE: MutationResult = {
  ok: false,
  error: "You're offline. Checklist changes can be saved once you're connected again.",
};

function failure(what: string, error: unknown): MutationResult {
  console.error(what, error);
  return { ok: false, error: getErrorMessage(error) };
}

type LoadResult = { items: ChecklistItem[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchItems(tripId: string): Promise<LoadResult> {
  try {
    return { items: await ChecklistService.listByTrip(tripId) };
  } catch (e) {
    console.error('Loading checklist failed', e);
    return { error: getErrorMessage(e) };
  }
}

/**
 * The active trip's shared checklist. Mounted once per trip (the parent keys it
 * on the trip id), so switching trips never shows the previous trip's list.
 * Readable offline from the saved copy; changes need a connection.
 */
export function ChecklistProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  const { userId } = useAuth();
  const { online, onReconnect } = useNetwork();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const inFlight = useRef(new Set<string>()); // items with a tick request running, so a double tap can't race itself
  const cacheName = `checklist:${tripId}`;

  const applyCache = useCallback((cached: ChecklistItem[] | null) => {
    if (cached && !gotFreshData.current) setItems(ChecklistModel.sort(cached));
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult) => {
    if ('items' in result) {
      gotFreshData.current = true;
      setItems(result.items);
      setError(null);
    } else {
      setError(result.error); // keep showing the saved items
    }
    setLoading(false);
  }, []);

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!tripId || !userId) return;
    void CacheService.read<ChecklistItem[]>(userId, cacheName).then(applyCache);
    void fetchItems(tripId).then(applyLoadResult);
  }, [tripId, userId, cacheName, applyCache, applyLoadResult]);

  // Keep the saved copy current. Waits until the old copy has been read so it isn't overwritten empty.
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

  const addItem = useCallback(
    async (input: NewChecklistItem): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      try {
        const created = await ChecklistService.create(tripId, input);
        setItems((current) => ChecklistModel.sort([...current, created]));
        return OK;
      } catch (e) {
        return failure('Adding checklist item failed', e);
      }
    },
    [tripId, online],
  );

  const updateItem = useCallback(
    async (id: string, input: NewChecklistItem): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        const updated = await ChecklistService.update(id, input);
        setItems((current) => ChecklistModel.sort(current.map((i) => (i.id === id ? updated : i))));
        return OK;
      } catch (e) {
        return failure('Updating checklist item failed', e);
      }
    },
    [online],
  );

  const setDone = useCallback(
    async (id: string, done: boolean): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      if (inFlight.current.has(id)) return OK;
      const before = items.find((i) => i.id === id);
      if (!before) return { ok: false, error: 'That item was removed. Pull down to refresh.' };
      inFlight.current.add(id);
      // Show the tick straight away; the server's answer (with the real completion time) replaces it.
      const guess: ChecklistItem = {
        ...before,
        done,
        completedBy: done ? userId : null,
        completedAt: done ? new Date().toISOString() : null,
      };
      setItems((current) => ChecklistModel.sort(current.map((i) => (i.id === id ? guess : i))));
      try {
        const saved = await ChecklistService.setDone(id, done);
        setItems((current) => ChecklistModel.sort(current.map((i) => (i.id === id ? saved : i))));
        return OK;
      } catch (e) {
        setItems((current) => ChecklistModel.sort(current.map((i) => (i.id === id ? before : i))));
        return failure('Updating checklist item failed', e);
      } finally {
        inFlight.current.delete(id);
      }
    },
    [online, items, userId],
  );

  const deleteItem = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        await ChecklistService.remove(id);
        setItems((current) => current.filter((i) => i.id !== id));
        return OK;
      } catch (e) {
        return failure('Deleting checklist item failed', e);
      }
    },
    [online],
  );

  const value = useMemo<ChecklistContextValue>(
    () => ({ items, loading, error, refresh, addItem, updateItem, setDone, deleteItem }),
    [items, loading, error, refresh, addItem, updateItem, setDone, deleteItem],
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}
