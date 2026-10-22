import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { LiveChange } from '../models/LiveChange';
import { LiveTable, RealtimeService } from '../services/RealtimeService';
import { useNetwork } from './useNetwork';

/**
 * A table to keep live and how to apply its changes. `onChange` is written for that table's
 * row shape (e.g. `(change: LiveChange<ExpenseRow>) => ...`); `never` lets one list hold
 * handlers for different shapes.
 */
export interface LiveTableHandler {
  table: LiveTable;
  onChange: (change: LiveChange<never>) => void;
}

interface Options {
  tripId: string | null;
  tables: LiveTableHandler[];
  /**
   * Reload quietly. Called when live updates come back after an outage and when the app
   * returns to the foreground, since changes may have been missed in between.
   */
  onResync: () => void;
}

/**
 * Keeps the active trip's lists live while the device is online, on one channel per caller.
 * Offline, it stops listening and the lists stay as saved; when the connection returns, the
 * providers reload (NetworkContext's onReconnect) and this subscribes again. If live updates
 * can't be set up at all (Realtime off, or 009_live_sync.sql not run), everything still works
 * with pull-to-refresh.
 */
export function useLiveSync({ tripId, tables, onResync }: Options) {
  const { online } = useNetwork();
  const tablesRef = useRef(tables);
  const onResyncRef = useRef(onResync);
  useEffect(() => {
    tablesRef.current = tables;
    onResyncRef.current = onResync;
  });
  const tableNames = tables.map((t) => t.table).join(',');

  useEffect(() => {
    if (!tripId || !online) return;
    let missedSome = false;
    const bindings = tableNames.split(',').map((table, index) => ({
      table: table as LiveTable,
      // Always call the latest handler, so the subscription doesn't restart on every render.
      onChange: (change: LiveChange<Record<string, unknown>>) => tablesRef.current[index]?.onChange(change as LiveChange<never>),
    }));
    return RealtimeService.subscribe(tripId, bindings, (status) => {
      if (status === 'live') {
        if (missedSome) onResyncRef.current(); // back after an outage: catch up on what was missed
        missedSome = false;
      } else {
        missedSome = true;
      }
    });
  }, [tripId, online, tableNames]);

  // A phone suspends the connection in the background, so catch up on returning to the app.
  useEffect(() => {
    if (!tripId || !online) return;
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') onResyncRef.current();
      previous = next;
    });
    return () => subscription.remove();
  }, [tripId, online]);
}
