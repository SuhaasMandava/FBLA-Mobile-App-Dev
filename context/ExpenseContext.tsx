import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveSync } from '../hooks/useLiveSync';
import { useNetwork } from '../hooks/useNetwork';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useTrip } from '../hooks/useTrip';
import { Expense, ExpenseModel, ExpenseRow, NewExpense } from '../models/ExpenseModel';
import { applyLiveChange, LiveChange } from '../models/LiveChange';
import { ReminderModel } from '../models/ReminderModel';
import { NewSettlement, Settlement, SettlementModel, SettlementRow } from '../models/SettlementModel';
import { CacheService } from '../services/CacheService';
import { getErrorMessage } from '../services/errors';
import { ExpenseService } from '../services/ExpenseService';
import { NotificationService } from '../services/NotificationService';
import { SettlementService } from '../services/SettlementService';
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
  /** Payments members have recorded as made ("Mark as paid"), newest first. Empty if 010_settlements.sql hasn't been run. */
  settlements: Settlement[];
  recordPayment: (payment: NewSettlement) => Promise<MutationResult>;
  undoPayment: (id: string) => Promise<MutationResult>;
}

export const ExpenseContext = createContext<ExpenseContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };
/** Writes need the server; say so up front instead of waiting for the request to time out. */
const OFFLINE: MutationResult = {
  ok: false,
  error: "You're offline. Expenses can be saved once you're connected again.",
};

const OFFLINE_PAYMENT: MutationResult = {
  ok: false,
  error: "You're offline. Payments can be recorded once you're connected again.",
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

/** Recorded payments are an extra on top of the expenses, so a failure here (say the migration isn't run yet) is logged, not shown. */
async function fetchSettlements(tripId: string): Promise<Settlement[] | null> {
  try {
    return await SettlementService.listByTrip(tripId);
  } catch (e) {
    console.error('Loading payments failed', e);
    return null;
  }
}

/**
 * The active trip's expenses and recorded payments. Mounted once per trip (the parent keys it on the
 * trip id), so switching trips never shows the previous trip's spending.
 * Readable offline from the saved copy; changes need a connection.
 */
export function ExpenseProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  const { userId } = useAuth();
  const { online, onReconnect } = useNetwork();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [gotFreshPayments, setGotFreshPayments] = useState(false);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const cacheName = `expenses:${tripId}`;
  const settlementsCacheName = `settlements:${tripId}`;
  const { activeTrip } = useTrip();
  const { prefs, permission } = useNotificationSettings();
  // For telling someone else's new expense apart from the echo of your own (see applyChange).
  const expensesRef = useRef(expenses);
  const savingNew = useRef(0);
  const createdHere = useRef(new Set<string>());
  const alertContext = useRef({ trip: activeTrip, userId, enabled: false });
  useEffect(() => {
    expensesRef.current = expenses;
    alertContext.current = { trip: activeTrip, userId, enabled: prefs.expenseAlerts && permission === 'granted' };
  });

  const applyCache = useCallback((cached: Expense[] | null) => {
    if (cached && !gotFreshData.current) setExpenses(ExpenseModel.sort(cached));
    setHydrated(true);
  }, []);

  const applyPayments = useCallback((fresh: Settlement[] | null) => {
    if (!fresh) return;
    setSettlements(fresh);
    setGotFreshPayments(true);
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
    void CacheService.read<Settlement[]>(userId, settlementsCacheName).then((cached) => {
      if (cached) setSettlements((current) => (current.length === 0 ? SettlementModel.sort(cached) : current));
    });
    void fetchExpenses(tripId).then(applyLoadResult);
    void fetchSettlements(tripId).then(applyPayments);
  }, [tripId, userId, cacheName, settlementsCacheName, applyCache, applyLoadResult, applyPayments]);

  // Keep the saved copy current. Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (tripId && userId && hydrated) void CacheService.write(userId, cacheName, expenses);
  }, [tripId, userId, hydrated, cacheName, expenses]);
  // Only after a payments answer from the server, so a failed load can't save an empty list over the old one.
  useEffect(() => {
    if (tripId && userId && gotFreshPayments) void CacheService.write(userId, settlementsCacheName, settlements);
  }, [tripId, userId, gotFreshPayments, settlementsCacheName, settlements]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    const [result, payments] = await Promise.all([fetchExpenses(tripId), fetchSettlements(tripId)]);
    applyPayments(payments);
    applyLoadResult(result);
  }, [tripId, applyLoadResult, applyPayments]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

  // Changes from other phones arrive live; a quiet reload covers anything missed.
  const resync = useCallback(async () => {
    if (!tripId) return;
    const [result, payments] = await Promise.all([fetchExpenses(tripId), fetchSettlements(tripId)]);
    applyPayments(payments);
    applyLoadResult(result);
  }, [tripId, applyLoadResult, applyPayments]);
  // A new expense from someone else also raises an alert (if they're turned on). Your own
  // expenses come back as echoes; they're recognized while saving or by their id afterwards.
  const applyChange = useCallback((change: LiveChange<ExpenseRow>) => {
    if (
      change.type === 'upsert' &&
      savingNew.current === 0 &&
      !createdHere.current.has(change.row.id) &&
      !expensesRef.current.some((e) => e.id === change.row.id)
    ) {
      const { trip, userId: me, enabled } = alertContext.current;
      const alert = enabled && trip ? ReminderModel.expenseAlert(ExpenseModel.fromRow(change.row), trip, me) : null;
      if (alert) void NotificationService.showNow(alert.title, alert.body);
    }
    setExpenses((current) => applyLiveChange(current, change, ExpenseModel.fromRow, ExpenseModel.sort));
  }, []);
  const applyPaymentChange = useCallback((change: LiveChange<SettlementRow>) => {
    setSettlements((current) => applyLiveChange(current, change, SettlementModel.fromRow, SettlementModel.sort));
  }, []);
  useLiveSync({
    tripId,
    tables: [{ table: 'expenses', onChange: applyChange }],
    onResync: () => void resync(),
  });
  // Its own channel: if 010_settlements.sql hasn't been run, this one fails without taking expense updates down with it.
  useLiveSync({
    tripId,
    tables: [{ table: 'settlements', onChange: applyPaymentChange }],
    onResync: () => void resync(),
  });

  const addExpense = useCallback(
    async (input: NewExpense): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      savingNew.current += 1;
      try {
        const created = await ExpenseService.create(tripId, input);
        createdHere.current.add(created.id);
        setExpenses((current) => ExpenseModel.sort([...current, created]));
        return OK;
      } catch (e) {
        return failure('Adding expense failed', e);
      } finally {
        savingNew.current -= 1;
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

  const recordPayment = useCallback(
    async (payment: NewSettlement): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE_PAYMENT;
      try {
        const created = await SettlementService.create(tripId, payment);
        setSettlements((current) => SettlementModel.sort([...current.filter((s) => s.id !== created.id), created]));
        return OK;
      } catch (e) {
        return failure('Recording payment failed', e);
      }
    },
    [tripId, online],
  );

  const undoPayment = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE_PAYMENT;
      try {
        await SettlementService.remove(id);
        setSettlements((current) => current.filter((s) => s.id !== id));
        return OK;
      } catch (e) {
        return failure('Undoing payment failed', e);
      }
    },
    [online],
  );

  const value = useMemo<ExpenseContextValue>(
    () => ({ expenses, loading, error, refresh, addExpense, updateExpense, deleteExpense, settlements, recordPayment, undoPayment }),
    [expenses, loading, error, refresh, addExpense, updateExpense, deleteExpense, settlements, recordPayment, undoPayment],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}
