import { PostgrestError } from '@supabase/supabase-js';
import { CHAT_PAGE_SIZE, ChatMessage, ChatMessageRow, ChatModel } from '../models/ChatModel';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const INSUFFICIENT_PRIVILEGE = '42501';

/** Writes fail with a trigger message or a Row Level Security code (see 013_trip_chat.sql); turn those into plain language. */
function toChatError(error: PostgrestError, notAllowed: string): unknown {
  if (error.message.includes('activity_not_found')) {
    return new TripServiceError('item_not_found', 'That activity was removed. Send the message without it.');
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) return new TripServiceError('not_permitted', notAllowed);
  return error;
}

export const ChatService = {
  /** The trip's most recent messages, oldest first. Any member may read them. */
  async list(tripId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('trip_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(CHAT_PAGE_SIZE);
    if (error) throw error;
    return ChatModel.sort((data as ChatMessageRow[]).map(ChatModel.fromRow));
  },

  /** Send to the group, optionally about one activity. The database fills in the author and the time. */
  async send(tripId: string, body: string, itemId: string | null): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('trip_messages')
      .insert({ trip_id: tripId, body, item_id: itemId })
      .select('*')
      .single();
    if (error) throw toChatError(error, "You're not part of this trip, so you can't send messages to it.");
    return ChatModel.fromRow(data as ChatMessageRow);
  },

  /** Whoever wrote it, or an organizer. */
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('trip_messages').delete().eq('id', id).select('id');
    if (error) throw toChatError(error, 'Only whoever wrote this message, or the trip organizer, can delete it.');
    if (!data || data.length === 0) {
      throw new TripServiceError(
        'not_permitted',
        'That message is already gone, or only whoever wrote it or the trip organizer can delete it.',
      );
    }
  },
};
