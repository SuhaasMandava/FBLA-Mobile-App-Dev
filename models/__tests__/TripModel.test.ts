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
