import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveSync } from '../hooks/useLiveSync';
import { useNetwork } from '../hooks/useNetwork';
import { ChatMessage, ChatMessageRow, ChatModel } from '../models/ChatModel';
import { applyLiveChange, LiveChange } from '../models/LiveChange';
import { CacheService } from '../services/CacheService';
import { ChatService } from '../services/ChatService';
import { getErrorMessage } from '../services/errors';
import { MutationResult } from './ItineraryContext';
import { PerTripProvider } from './PerTripProvider';

export interface ChatContextValue {
  /** The active trip's messages, oldest first. */
  messages: ChatMessage[];
  /** True while the first load for this trip is running or a refresh is in progress. */
  loading: boolean;
  /** Why loading failed, if it did. Saved messages are still shown alongside it. */
  error: string | null;
  /** Messages from other people since the chat was last open on this phone. */
  unreadCount: number;
  /** Call while the chat is on screen: everything up to the newest message counts as read. */
  markRead: () => void;
  refresh: () => Promise<void>;
  send: (body: string, itemId?: string | null) => Promise<MutationResult>;
  remove: (id: string) => Promise<MutationResult>;
}

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };
/** Writes need the server; say so up front instead of waiting for the request to time out. */
const OFFLINE: MutationResult = { ok: false, error: "You're offline. Messages can be sent once you're connected again." };

function failure(what: string, error: unknown): MutationResult {
  console.error(what, error);
  return { ok: false, error: getErrorMessage(error) };
}

type LoadResult = { messages: ChatMessage[] } | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchMessages(tripId: string): Promise<LoadResult> {
  try {
    return { messages: await ChatService.list(tripId) };
  } catch (e) {
    console.error('Loading chat failed', e);
    return { error: getErrorMessage(e) };
  }
}

/**
 * The active trip's chat. Runs once per trip (PerTripProvider keys it on the trip id), so switching trips
 * never shows the previous trip's messages. Readable offline from the saved copy; sending needs a connection.
 * Other phones' messages arrive live; unread counts are remembered per trip on this phone.
 */
function useChatStore(tripId: string | null): ChatContextValue {
  const { userId } = useAuth();
  const { online, onReconnect } = useNetwork();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const cacheName = `chat:${tripId}`;
  const readName = `chatRead:${tripId}`;

  const applyCache = useCallback((cached: ChatMessage[] | null) => {
    if (cached && !gotFreshData.current) setMessages(ChatModel.sort(cached));
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult) => {
    if ('error' in result) {
      setError(result.error); // keep showing the saved messages
    } else {
      gotFreshData.current = true;
      setMessages(result.messages);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!tripId || !userId) return;
    void CacheService.read<ChatMessage[]>(userId, cacheName).then(applyCache);
    void CacheService.read<string>(userId, readName).then((saved) => typeof saved === 'string' && setLastReadAt(saved));
    void fetchMessages(tripId).then(applyLoadResult);
  }, [tripId, userId, cacheName, readName, applyCache, applyLoadResult]);

  // Keep the saved copy current. Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (tripId && userId && hydrated) void CacheService.write(userId, cacheName, messages);
  }, [tripId, userId, hydrated, cacheName, messages]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    applyLoadResult(await fetchMessages(tripId));
  }, [tripId, applyLoadResult]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

  const resync = useCallback(async () => {
    if (tripId) applyLoadResult(await fetchMessages(tripId));
  }, [tripId, applyLoadResult]);
  useLiveSync({
    tripId,
    tables: [
      {
        table: 'trip_messages',
        onChange: (change: LiveChange<ChatMessageRow>) =>
          setMessages((current) => applyLiveChange(current, change, ChatModel.fromRow, ChatModel.sort)),
      },
    ],
    onResync: () => void resync(),
  });

  const markRead = useCallback(() => {
    const newest = ChatModel.latest(messages);
    if (!newest || !userId || (lastReadAt !== null && newest.createdAt <= lastReadAt)) return;
    setLastReadAt(newest.createdAt);
    void CacheService.write(userId, readName, newest.createdAt);
  }, [messages, userId, lastReadAt, readName]);

  const send = useCallback(
    async (body: string, itemId: string | null = null): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      try {
        const created = await ChatService.send(tripId, body, itemId);
        setMessages((current) => applyLiveChange(current, { type: 'upsert', row: created }, (m) => m, ChatModel.sort));
        return OK;
      } catch (e) {
        return failure('Sending message failed', e);
      }
    },
    [tripId, online],
  );

  const remove = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        await ChatService.remove(id);
        setMessages((current) => current.filter((m) => m.id !== id));
        return OK;
      } catch (e) {
        return failure('Deleting message failed', e);
      }
    },
    [online],
  );

  const unreadCount = useMemo(() => ChatModel.unreadCount(messages, lastReadAt, userId), [messages, lastReadAt, userId]);

  return useMemo<ChatContextValue>(
    () => ({ messages, loading, error, unreadCount, markRead, refresh, send, remove }),
    [messages, loading, error, unreadCount, markRead, refresh, send, remove],
  );
}

/** Provides the active trip's chat. Changing `tripId` resets it without remounting what's inside. */
export function ChatProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  return (
    <PerTripProvider tripId={tripId} context={ChatContext} useStore={useChatStore}>
      {children}
    </PerTripProvider>
  );
}
