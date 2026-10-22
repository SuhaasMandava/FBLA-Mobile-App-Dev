import { Trip, TripModel } from '../TripModel';

const trip: Trip = {
  id: 't',
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  budgetCents: 150000,
  inviteCode: 'K7M9PQ',
  members: [
    { userId: 'sam', role: 'organizer', displayName: 'Sam Lee' },
    { userId: 'alex', role: 'member', displayName: null },
  ],
};

describe('TripModel.inviteMessage', () => {
  it('includes the join link and the code', () => {
    const message = TripModel.inviteMessage(trip);
    expect(message).toContain('triphub://join/K7M9PQ');
    expect(message).toContain('enter K7M9PQ');
    expect(message).toContain('"Beach week"');
  });

  it('is null for a trip without a code', () => {
    expect(TripModel.inviteMessage({ ...trip, inviteCode: null })).toBeNull();
  });
});

describe('TripModel.socialPost', () => {
  it('names the trip but never the invite code', () => {
    const post = TripModel.socialPost(trip);
    expect(post).toContain('Beach week');
    expect(post).toContain('Maui');
    expect(post).not.toContain('K7M9PQ');
    expect(post).not.toContain('triphub://');
  });
});

describe('TripModel roles', () => {
  it('knows who organizes', () => {
    expect(TripModel.isOrganizer(trip, 'sam')).toBe(true);
    expect(TripModel.isOrganizer(trip, 'alex')).toBe(false);
    expect(TripModel.isOrganizer(trip, null)).toBe(false);
  });

  it('names members, with a fallback', () => {
    expect(TripModel.memberName(trip.members[0])).toBe('Sam Lee');
    expect(TripModel.memberName(trip.members[1])).toBe('Trip member');
  });
});

describe('TripModel organizer tools (mirror 004 and 008)', () => {
  const group: Trip = {
    ...trip,
    members: [
      { userId: 'sam', role: 'organizer', displayName: 'Sam Lee' },
      { userId: 'alex', role: 'member', displayName: 'Alex Kim' },
      { userId: 'jo', role: 'member', displayName: null },
    ],
  };

  it('lets members leave freely', () => {
    expect(TripModel.leaveBlockedReason(group, 'alex')).toBeNull();
  });

  it('stops the last organizer from leaving, with advice that fits', () => {
    expect(TripModel.leaveBlockedReason(group, 'sam')).toMatch(/only organizer/);
    const alone: Trip = { ...group, members: [group.members[0]] };
    expect(TripModel.leaveBlockedReason(alone, 'sam')).toMatch(/only one on this trip/);
  });

  it('lets an organizer leave once someone else organizes too', () => {
    expect(TripModel.leaveBlockedReason(TripModel.withOrganizer(group, 'alex'), 'sam')).toBeNull();
  });

  it('lets only organizers remove others, never themselves, and only people on the trip', () => {
    expect(TripModel.canRemoveMember(group, 'sam', 'alex')).toBe(true);
    expect(TripModel.canRemoveMember(group, 'sam', 'sam')).toBe(false);
    expect(TripModel.canRemoveMember(group, 'alex', 'jo')).toBe(false);
    expect(TripModel.canRemoveMember(group, 'sam', 'stranger')).toBe(false);
    expect(TripModel.canRemoveMember(group, null, 'alex')).toBe(false);
  });

  it('lets organizers promote members but not re-promote organizers', () => {
    expect(TripModel.canMakeOrganizer(group, 'sam', 'alex')).toBe(true);
    expect(TripModel.canMakeOrganizer(group, 'sam', 'sam')).toBe(false);
    expect(TripModel.canMakeOrganizer(group, 'alex', 'jo')).toBe(false);
  });

  it('updates the roster without touching the original', () => {
    const without = TripModel.withoutMember(group, 'alex');
    expect(without.members.map((m) => m.userId)).toEqual(['sam', 'jo']);
    expect(group.members).toHaveLength(3);
    const promoted = TripModel.withOrganizer(group, 'jo');
    expect(promoted.members.find((m) => m.userId === 'jo')?.role).toBe('organizer');
    expect(group.members.find((m) => m.userId === 'jo')?.role).toBe('member');
  });
});
