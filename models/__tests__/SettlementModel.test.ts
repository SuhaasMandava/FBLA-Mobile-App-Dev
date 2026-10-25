import { SettlementModel, SettlementRow } from '../SettlementModel';
import { Trip } from '../TripModel';

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
    { userId: 'alex', role: 'member', displayName: 'Alex' },
    { userId: 'jo', role: 'member', displayName: 'Jo' },
  ],
};

const row: SettlementRow = {
  id: 's1',
  trip_id: 't',
  from_user: 'alex',
  to_user: 'jo',
  amount_cents: 2500,
  created_at: '2026-07-03T10:00:00Z',
};

describe('SettlementModel', () => {
  it('maps a row to a settlement and back to an insert row', () => {
    const payment = SettlementModel.fromRow(row);
    expect(payment).toEqual({ id: 's1', tripId: 't', fromUser: 'alex', toUser: 'jo', amountCents: 2500, createdAt: '2026-07-03T10:00:00Z' });
    expect(SettlementModel.toInsertRow('t', payment)).toEqual({ trip_id: 't', from_user: 'alex', to_user: 'jo', amount_cents: 2500 });
  });

  it('sorts newest first, breaking ties by id', () => {
    const a = SettlementModel.fromRow({ ...row, id: 'a', created_at: '2026-07-01T00:00:00Z' });
    const b = SettlementModel.fromRow({ ...row, id: 'b', created_at: '2026-07-02T00:00:00Z' });
    const c = SettlementModel.fromRow({ ...row, id: 'c', created_at: '2026-07-02T00:00:00Z' });
    expect(SettlementModel.sort([a, c, b]).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('lets only the person paid, or an organizer, record a payment', () => {
    expect(SettlementModel.canRecord({ toUser: 'jo' }, trip, 'jo')).toBe(true);
    expect(SettlementModel.canRecord({ toUser: 'jo' }, trip, 'sam')).toBe(true);
    expect(SettlementModel.canRecord({ toUser: 'jo' }, trip, 'alex')).toBe(false);
    expect(SettlementModel.canRecord({ toUser: 'jo' }, trip, null)).toBe(false);
  });

  it('lets either person in the payment, or an organizer, undo it', () => {
    const payment = { fromUser: 'alex', toUser: 'jo' };
    expect(SettlementModel.canManage(payment, trip, 'alex')).toBe(true);
    expect(SettlementModel.canManage(payment, trip, 'jo')).toBe(true);
    expect(SettlementModel.canManage(payment, trip, 'sam')).toBe(true);
    expect(SettlementModel.canManage({ fromUser: 'sam', toUser: 'jo' }, trip, 'alex')).toBe(false);
    expect(SettlementModel.canManage(payment, trip, null)).toBe(false);
  });
});
