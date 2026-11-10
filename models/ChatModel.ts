import { todayISO } from '../utils/dates';
import { Trip, TripModel } from './TripModel';

/**
 * Domain shapes and rules for the trip's group chat: one conversation per trip, where a
 * message may point at an itinerary activity. Pure data: no React, no network.
 */
export interface ChatMessage {
  id: string;
  tripId: string;
  body: string;
  /** The activity the message is about; null if none, or if that activity was deleted. */
  itemId: string | null;
  /** Who sent it; null if their account is gone. */
  createdBy: string | null;
  createdAt: string; // ISO timestamp
}

export interface ChatMessageRow {
  id: string;
  trip_id: string;
  body: string;
  item_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** How many of the latest messages the app loads and keeps on the device. */
export const CHAT_PAGE_SIZE = 200;

/** One line of the conversation as drawn: a day divider, or a message with how it sits in its run. */
export type ChatEntry =
  | { kind: 'day'; key: string; day: string }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      /** First of a run by the same person (on the same day): show who is talking. */
      startsRun: boolean;
      /** Last of that run: show the time. */
      endsRun: boolean;
    };

const byOldest = (a: ChatMessage, b: ChatMessage) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** The local calendar day a message was sent on, as YYYY-MM-DD. */
function dayOf(message: ChatMessage): string {
  return todayISO(new Date(message.createdAt));
}

export const ChatModel = {
  fromRow(row: ChatMessageRow): ChatMessage {
    return {
      id: row.id,
      tripId: row.trip_id,
      body: row.body,
      itemId: row.item_id ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
    };
  },

  /** Oldest first, so the conversation reads top to bottom. */
  sort(messages: ChatMessage[]): ChatMessage[] {
    return [...messages].sort(byOldest);
  },

  /** The most recent message, or null in an empty chat. */
  latest(messages: ChatMessage[]): ChatMessage | null {
    return messages.length === 0 ? null : ChatModel.sort(messages)[messages.length - 1];
  },

  /**
   * The conversation as lines to draw, oldest first: a divider at each new day, and messages
   * grouped into runs by sender so a name and a time are shown once per run, not on every bubble.
   */
  entries(messages: ChatMessage[]): ChatEntry[] {
    const sorted = ChatModel.sort(messages);
    const entries: ChatEntry[] = [];
    sorted.forEach((message, i) => {
      const day = dayOf(message);
      const previous = sorted[i - 1];
      const next = sorted[i + 1];
      const newDay = !previous || dayOf(previous) !== day;
      if (newDay) entries.push({ kind: 'day', key: `day-${day}`, day });
      entries.push({
        kind: 'message',
        key: message.id,
        message,
        startsRun: newDay || previous.createdBy !== message.createdBy,
        endsRun: !next || dayOf(next) !== day || next.createdBy !== message.createdBy,
      });
    });
    return entries;
  },

  /**
   * Messages from other people that arrived after this person last had the chat open.
   * `lastReadAt` is null if they never opened it: then everything from others counts.
   */
  unreadCount(messages: ChatMessage[], lastReadAt: string | null, me: string | null): number {
    return messages.filter((m) => m.createdBy !== me && (lastReadAt === null || m.createdAt > lastReadAt)).length;
  },

  /** The same rule the database enforces: whoever wrote a message, or an organizer, may delete it. */
  canDelete(message: ChatMessage, trip: Trip, userId: string | null): boolean {
    return userId !== null && (message.createdBy === userId || TripModel.isOrganizer(trip, userId));
  },

  /** The same rule the database enforces: only people on the trip can send. */
  canSend(trip: Trip, userId: string | null): boolean {
    return userId !== null && trip.members.some((m) => m.userId === userId);
  },

  /** A one-line preview for the Home screen: long or multi-line messages are cut short. */
  preview(body: string, max = 80): string {
    const oneLine = body.replace(/\s+/g, ' ').trim();
    return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1).trimEnd()}…`;
  },
};
