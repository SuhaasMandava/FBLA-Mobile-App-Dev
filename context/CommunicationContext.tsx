import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../hooks/useNetwork';
import { ActivityComment, Announcement, CommunicationModel } from '../models/CommunicationModel';
import { CacheService } from '../services/CacheService';
import { CommunicationService } from '../services/CommunicationService';
import { getErrorMessage } from '../services/errors';
import { MutationResult } from './ItineraryContext';

export interface CommunicationContextValue {
  /** The active trip's announcements, newest first. */
  announcements: Announcement[];
  /** Comments on all of the active trip's activities, oldest first. */
  comments: ActivityComment[];
  /** True while the first load for this trip is running or a refresh is in progress. */
  loading: boolean;
  /** Why loading failed, if it did. Saved messages are still shown alongside it. */
  error: string | null;
  refresh: () => Promise<void>;
  postAnnouncement: (body: string) => Promise<MutationResult>;
  deleteAnnouncement: (id: string) => Promise<MutationResult>;
  addComment: (itemId: string, body: string) => Promise<MutationResult>;
  deleteComment: (id: string) => Promise<MutationResult>;
}

export const CommunicationContext = createContext<CommunicationContextValue | undefined>(undefined);

const OK: MutationResult = { ok: true };
const NO_TRIP: MutationResult = { ok: false, error: 'Pick a trip first.' };
/** Writes need the server; say so up front instead of waiting for the request to time out. */
const OFFLINE: MutationResult = {
  ok: false,
  error: "You're offline. Messages can be posted once you're connected again.",
};

function failure(what: string, error: unknown): MutationResult {
  console.error(what, error);
  return { ok: false, error: getErrorMessage(error) };
}

/** What's saved on the device so messages are readable without a connection. */
interface MessagesCache {
  announcements: Announcement[];
  comments: ActivityComment[];
}

type LoadResult = MessagesCache | { error: string };

/** Never throws: failures come back as a user-facing message so callers just apply the result. */
async function fetchMessages(tripId: string): Promise<LoadResult> {
  try {
    const [announcements, comments] = await Promise.all([
      CommunicationService.listAnnouncements(tripId),
      CommunicationService.listComments(tripId),
    ]);
    return { announcements, comments };
  } catch (e) {
    console.error('Loading messages failed', e);
    return { error: getErrorMessage(e) };
  }
}

/**
 * The active trip's announcements and activity comments. Mounted once per trip
 * (the parent keys it on the trip id), so switching trips never shows the
 * previous trip's messages. Readable offline from the saved copy; posting needs
 * a connection.
 */
export function CommunicationProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  const { userId } = useAuth();
  const { online, onReconnect } = useNetwork();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(tripId !== null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // has the saved copy been read yet?
  const gotFreshData = useRef(false); // a server answer always beats the saved copy
  const cacheName = `messages:${tripId}`;

  const applyCache = useCallback((cached: MessagesCache | null) => {
    if (cached && !gotFreshData.current) {
      setAnnouncements(CommunicationModel.sortAnnouncements(cached.announcements ?? []));
      setComments(CommunicationModel.sortComments(cached.comments ?? []));
    }
    setHydrated(true);
  }, []);

  const applyLoadResult = useCallback((result: LoadResult) => {
    if ('error' in result) {
      setError(result.error); // keep showing the saved messages
    } else {
      gotFreshData.current = true;
      setAnnouncements(result.announcements);
      setComments(result.comments);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Show the saved copy straight away while the real one loads.
  useEffect(() => {
    if (!tripId || !userId) return;
    void CacheService.read<MessagesCache>(userId, cacheName).then(applyCache);
    void fetchMessages(tripId).then(applyLoadResult);
  }, [tripId, userId, cacheName, applyCache, applyLoadResult]);

  // Keep the saved copy current. Waits until the old copy has been read so it isn't overwritten empty.
  useEffect(() => {
    if (tripId && userId && hydrated) {
      void CacheService.write(userId, cacheName, { announcements, comments } satisfies MessagesCache);
    }
  }, [tripId, userId, hydrated, cacheName, announcements, comments]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    applyLoadResult(await fetchMessages(tripId));
  }, [tripId, applyLoadResult]);

  // Catch up automatically when the connection comes back.
  useEffect(() => onReconnect(() => void refresh()), [onReconnect, refresh]);

  const postAnnouncement = useCallback(
    async (body: string): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      try {
        const created = await CommunicationService.postAnnouncement(tripId, body);
        setAnnouncements((current) => CommunicationModel.sortAnnouncements([...current, created]));
        return OK;
      } catch (e) {
        return failure('Posting announcement failed', e);
      }
    },
    [tripId, online],
  );

  const deleteAnnouncement = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        await CommunicationService.deleteAnnouncement(id);
        setAnnouncements((current) => current.filter((a) => a.id !== id));
        return OK;
      } catch (e) {
        return failure('Deleting announcement failed', e);
      }
    },
    [online],
  );

  const addComment = useCallback(
    async (itemId: string, body: string): Promise<MutationResult> => {
      if (!tripId) return NO_TRIP;
      if (!online) return OFFLINE;
      try {
        const created = await CommunicationService.addComment(itemId, body);
        setComments((current) => CommunicationModel.sortComments([...current, created]));
        return OK;
      } catch (e) {
        return failure('Adding comment failed', e);
      }
    },
    [tripId, online],
  );

  const deleteComment = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!online) return OFFLINE;
      try {
        await CommunicationService.deleteComment(id);
        setComments((current) => current.filter((c) => c.id !== id));
        return OK;
      } catch (e) {
        return failure('Deleting comment failed', e);
      }
    },
    [online],
  );

  const value = useMemo<CommunicationContextValue>(
    () => ({
      announcements,
      comments,
      loading,
      error,
      refresh,
      postAnnouncement,
      deleteAnnouncement,
      addComment,
      deleteComment,
    }),
    [announcements, comments, loading, error, refresh, postAnnouncement, deleteAnnouncement, addComment, deleteComment],
  );

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}
