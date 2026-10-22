import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { LiveChange } from '../models/LiveChange';
import { supabase } from './supabase';

/** Tables the app listens to; each has a `trip_id` column and is in the realtime publication (009_live_sync.sql). */
export type LiveTable = 'itinerary_items' | 'expenses' | 'checklist_items' | 'trip_announcements' | 'activity_comments';

/** `live` once the server is sending changes; `down` when the channel failed, timed out or closed. */
export type LiveStatus = 'live' | 'down';

/** One table to listen to, and what to do with each change. Rows are untyped here; each caller knows its row shape. */
export interface LiveBinding {
  table: LiveTable;
  onChange: (change: LiveChange<Record<string, unknown>>) => void;
}

let channelCount = 0;

export const RealtimeService = {
  /**
   * Listen for changes to one trip's rows in the given tables, on one channel. Inserts and
   * updates come filtered to the trip (and checked against Row Level Security by Supabase);
   * deletes come with only the id. Returns a function that stops listening.
   */
  subscribe(tripId: string, bindings: LiveBinding[], onStatus: (status: LiveStatus) => void): () => void {
    // A unique topic per subscription, so a quick unsubscribe/subscribe never collides with the old channel.
    channelCount += 1;
    let channel = supabase.channel(`live:${tripId}:${channelCount}`);
    for (const { table, onChange } of bindings) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old.id;
            if (typeof id === 'string') onChange({ type: 'delete', id });
          } else {
            onChange({ type: 'upsert', row: payload.new });
          }
        },
      );
    }
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        onStatus('live');
      } else {
        if (err) console.warn('Live updates unavailable', err.message);
        onStatus('down');
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
