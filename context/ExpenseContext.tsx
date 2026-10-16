import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { Expense, ExpenseModel, NewExpense } from '../models/ExpenseModel';
import { CacheService } from '../services/CacheService';
import { getErrorMessage } from '../services/errors';
import { ExpenseService } from '../services/ExpenseService';
import { MutationResult } from './ItineraryContext';

export interface ExpenseContextValue {
  /** Expenses of the active trip, newest first. */
  expenses: Expense[];
  /** True while the first load for this trip is running or a refresh is in progress. */
  loading: boolean;
  /** Why loading failed, if it did. Saved expenses are still shown alongside it. */
  error: string | null;
  refresh: () => Promise<void>;
  addExpense: (expense: NewExpense) => Promise<MutationResult>;
  updateExpense: (id: string, expense: NewExpense) => Promise<MutationResult>;
  deleteExpense: (id: string) => Promise<MutationResult>;
}

export const ExpenseContext = createContext<ExpenseContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };
/** Writes need the server; say so up front instead of waiting for the request to time out. */
const OFFLINE: MutationResult = {
  ok: false,
  error: "You're offline. Expenses can be saved once you're connected again.",
};

function failure(what: string, error: unknown): MutationResult {
  console.error(what, error);
  return { ok: false, error: getErrorMessage(error) };
}

type LoadResult = { expenses: Expense[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchExpenses(tripId: string): Promise<LoadResult> {
  try {
    return { expenses: await ExpenseService.listByTrip(tripId) };
  } catch (e) {
    console.error('Loading expenses failed', e);
    return { error: getErrorMessage(e) };
  }
}

/**
 * The active trip's expenses. Mounted once per trip (the parent keys it on the
 * trip id), so switching trips never shows the previous trip's spending.
 * Readable offline from the saved copy; changes need a connection.
 */
export function ExpenseProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  const { userId } = useAuth();
  const { online, onReconnect } = useNetwork();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const cacheName = `expenses:${tripId}`;

  const applyCache = useCallback((cached: Expense[] | null) => {
    if (cached && !gotFreshData.current) setExpenses(ExpenseModel.sort(cached));
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult) => {
    if ('expenses' in result) {
      gotFreshData.current = true;
      setExpenses(result.expenses);
      setError(null);
    } else {
      setError(result.error); // keep showing the saved expenses
    }
    setLoading(false);
  }, []);

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!tripId || !userId) return;
    void CacheService.read<Expense[]>(userId, cacheName).then(applyCache);
    void fetchExpenses(tripId).then(applyLoadResult);
  }, [tripId, userId, cacheName, applyCache, applyLoadResult]);

  // Keep the saved copy current. Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (tripId && userId && hydrated) void CacheService.write(userId, cacheName, expenses);
  }, [tripId, userId, hydrated, cacheName, expenses]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    applyLoadResult(await fetchExpenses(tripId));
  }, [tripId, applyLoadResult]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

  const addExpense = useCallback(
    async (input: NewExpense): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      try {
        const created = await ExpenseService.create(tripId, input);
        setExpenses((current) => ExpenseModel.sort([...current, created]));
        return OK;
      } catch (e) {
        return failure('Adding expense failed', e);
      }
    },
    [tripId, online],
  );

  const updateExpense = useCallback(
    async (id: string, input: NewExpense): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        const updated = await ExpenseService.update(id, input);
        setExpenses((current) => ExpenseModel.sort(current.map((e) => (e.id === id ? updated : e))));
        return OK;
      } catch (e) {
        return failure('Updating expense failed', e);
      }
    },
    [online],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        await ExpenseService.remove(id);
        setExpenses((current) => current.filter((e) => e.id !== id));
        return OK;
      } catch (e) {
        return failure('Deleting expense failed', e);
      }
    },
    [online],
  );

  const value = useMemo<ExpenseContextValue>(
    () => ({ expenses, loading, error, refresh, addExpense, updateExpense, deleteExpense }),
    [expenses, loading, error, refresh, addExpense, updateExpense, deleteExpense],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}
