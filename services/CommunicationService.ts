import { PostgrestError } from '@supabase/supabase-js';
import {
  ActivityComment,
  ActivityCommentRow,
  Announcement,
  AnnouncementRow,
  CommunicationModel,
} from '../models/CommunicationModel';
import { TripServiceError } from './errors';
import { supabase } from './supabase';

const INSUFFICIENT_PRIVILEGE = '42501';

/** Writes fail with a trigger message or a Row Level Security code (see 007_communication.sql); turn those into plain language. */
function toMessageError(error: PostgrestError, notAllowed: string): unknown {
  if (error.message.includes('activity_not_found')) {
    return new TripServiceError('item_not_found', 'That activity was removed, so it can no longer get comments.');
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) return new TripServiceError('not_permitted', notAllowed);
  return error;
}

export const CommunicationService = {
  /** A trip's announcements, newest first. Any member may read them. */
  async listAnnouncements(tripId: string): Promise<Announcement[]> {
    const { data, error } = await supabase.from('trip_announcements').select('*').eq('trip_id', tripId);
    if (error) throw error;
    return CommunicationModel.sortAnnouncements((data as AnnouncementRow[]).map(CommunicationModel.announcementFromRow));
  },

  /** Post to the whole group. Organizers only; the database fills in the author and time. */
  async postAnnouncement(tripId: string, body: string): Promise<Announcement> {
    const { data, error } = await supabase
      .from('trip_announcements')
      .insert({ trip_id: tripId, body })
      .select('*')
      .single();
    if (error) throw toMessageError(error, 'Only the trip organizer can post announcements.');
    return CommunicationModel.announcementFromRow(data as AnnouncementRow);
  },

  /** Organizers only. */
  async deleteAnnouncement(id: string): Promise<void> {
    const { data, error } = await supabase.from('trip_announcements').delete().eq('id', id).select('id');
    if (error) throw toMessageError(error, 'Only the trip organizer can delete announcements.');
    if (!data || data.length === 0) {
      throw new TripServiceError('not_permitted', 'That announcement is already gone, or only the trip organizer can delete it.');
    }
  },

  /** Every comment on every activity of a trip, oldest first. Small enough to load at once and save for offline. */
  async listComments(tripId: string): Promise<ActivityComment[]> {
    const { data, error } = await supabase.from('activity_comments').select('*').eq('trip_id', tripId);
    if (error) throw error;
    return CommunicationModel.sortComments((data as ActivityCommentRow[]).map(CommunicationModel.commentFromRow));
  },

  /** Comment on an activity. Any member may; the database works out the trip from the activity. */
  async addComment(itemId: string, body: string): Promise<ActivityComment> {
    const { data, error } = await supabase
      .from('activity_comments')
      .insert({ item_id: itemId, body })
      .select('*')
      .single();
    if (error) throw toMessageError(error, "You're not part of this trip.");
    return CommunicationModel.commentFromRow(data as ActivityCommentRow);
  },

  /** Whoever wrote it, or an organizer. */
  async deleteComment(id: string): Promise<void> {
    const { data, error } = await supabase.from('activity_comments').delete().eq('id', id).select('id');
    if (error) throw toMessageError(error, 'Only whoever wrote this comment, or the trip organizer, can delete it.');
    if (!data || data.length === 0) {
      throw new TripServiceError(
        'not_permitted',
        'That comment is already gone, or only whoever wrote it or the trip organizer can delete it.',
      );
    }
  },
};
