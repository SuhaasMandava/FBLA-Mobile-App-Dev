import {
  ActivityComment,
  ActivityCommentRow,
  Announcement,
  AnnouncementRow,
  CommunicationModel,
} from '../CommunicationModel';
import { Trip } from '../TripModel';

const trip: Trip = {
  id: 't',
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  budgetCents: 0,
  inviteCode: null,
  members: [
    { userId: 'sam', role: 'organizer', displayName: 'Sam Lee' },
    { userId: 'alex', role: 'member', displayName: 'Alex Kim' },
    { userId: 'jo', role: 'member', displayName: null },
  ],
};

const comment = (id: string, itemId: string, createdAt: string, createdBy: string | null = 'alex'): ActivityComment => ({
  id,
  tripId: 't',
  itemId,
  body: `Comment ${id}`,
  createdBy,
  createdAt,
});

const announcement = (id: string, createdAt: string): Announcement => ({
  id,
  tripId: 't',
  body: `News ${id}`,
  createdBy: 'sam',
  createdAt,
});

describe('CommunicationModel row mapping', () => {
  it('maps an announcement row', () => {
    const row: AnnouncementRow = {
      id: 'a',
      trip_id: 't',
      body: 'Meet at 8',
      created_by: 'sam',
      created_at: '2026-07-01T08:00:00Z',
    };
    expect(CommunicationModel.announcementFromRow(row)).toEqual({
      id: 'a',
      tripId: 't',
      body: 'Meet at 8',
      createdBy: 'sam',
      createdAt: '2026-07-01T08:00:00Z',
    });
  });

  it('maps a comment row, keeping a deleted author as null', () => {
    const row: ActivityCommentRow = {
      id: 'c',
      trip_id: 't',
      item_id: 'hike',
      body: 'Bring water',
      created_by: null,
      created_at: '2026-07-01T08:00:00Z',
    };
    expect(CommunicationModel.commentFromRow(row)).toEqual({
      id: 'c',
      tripId: 't',
      itemId: 'hike',
      body: 'Bring water',
      createdBy: null,
      createdAt: '2026-07-01T08:00:00Z',
    });
  });
});

describe('CommunicationModel ordering', () => {
  it('puts the newest announcement first', () => {
    const sorted = CommunicationModel.sortAnnouncements([
      announcement('old', '2026-07-01T08:00:00Z'),
      announcement('new', '2026-07-03T08:00:00Z'),
      announcement('mid', '2026-07-02T08:00:00Z'),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['new', 'mid', 'old']);
  });

  it('reads a thread oldest first, only for the asked-for activity', () => {
    const all = [
      comment('2', 'hike', '2026-07-01T09:00:00Z'),
      comment('x', 'dinner', '2026-07-01T08:30:00Z'),
      comment('1', 'hike', '2026-07-01T08:00:00Z'),
    ];
    expect(CommunicationModel.commentsFor(all, 'hike').map((c) => c.id)).toEqual(['1', '2']);
    expect(CommunicationModel.commentsFor(all, 'nothing')).toEqual([]);
  });

  it('breaks timestamp ties by id so the order never jumps', () => {
    const same = '2026-07-01T08:00:00Z';
    const sorted = CommunicationModel.sortComments([comment('b', 'hike', same), comment('a', 'hike', same)]);
    expect(sorted.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('counts comments per activity', () => {
    const all = [
      comment('1', 'hike', '2026-07-01T08:00:00Z'),
      comment('2', 'hike', '2026-07-01T09:00:00Z'),
      comment('3', 'dinner', '2026-07-01T10:00:00Z'),
    ];
    expect(CommunicationModel.commentCounts(all)).toEqual({ hike: 2, dinner: 1 });
    expect(CommunicationModel.commentCounts([])).toEqual({});
  });
});

describe('CommunicationModel permissions (mirror the database policies)', () => {
  it('lets only organizers post and delete announcements', () => {
    expect(CommunicationModel.canPostAnnouncement(trip, 'sam')).toBe(true);
    expect(CommunicationModel.canPostAnnouncement(trip, 'alex')).toBe(false);
    expect(CommunicationModel.canPostAnnouncement(trip, null)).toBe(false);
    expect(CommunicationModel.canDeleteAnnouncement(trip, 'sam')).toBe(true);
    expect(CommunicationModel.canDeleteAnnouncement(trip, 'alex')).toBe(false);
  });

  it('lets the author or an organizer delete a comment', () => {
    const alexs = comment('1', 'hike', '2026-07-01T08:00:00Z', 'alex');
    expect(CommunicationModel.canDeleteComment(alexs, trip, 'alex')).toBe(true);
    expect(CommunicationModel.canDeleteComment(alexs, trip, 'sam')).toBe(true);
    expect(CommunicationModel.canDeleteComment(alexs, trip, 'jo')).toBe(false);
    expect(CommunicationModel.canDeleteComment(alexs, trip, null)).toBe(false);
  });

  it("doesn't treat a deleted author as matching a signed-out user", () => {
    const orphan = comment('1', 'hike', '2026-07-01T08:00:00Z', null);
    expect(CommunicationModel.canDeleteComment(orphan, trip, 'jo')).toBe(false);
  });
});

describe('CommunicationModel.authorName', () => {
  it('says You, the name, a fallback, or a former member', () => {
    expect(CommunicationModel.authorName(trip, 'alex', 'alex')).toBe('You');
    expect(CommunicationModel.authorName(trip, 'sam', 'alex')).toBe('Sam Lee');
    expect(CommunicationModel.authorName(trip, 'jo', 'alex')).toBe('Trip member');
    expect(CommunicationModel.authorName(trip, 'gone', 'alex')).toBe('A former member');
    expect(CommunicationModel.authorName(trip, null, null)).toBe('A former member');
  });

  it('gives the display name for initials, or null', () => {
    expect(CommunicationModel.authorDisplayName(trip, 'sam')).toBe('Sam Lee');
    expect(CommunicationModel.authorDisplayName(trip, 'gone')).toBeNull();
  });
});
