import { ChecklistItem, ChecklistItemRow, ChecklistModel } from '../ChecklistModel';
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

let n = 0;
const item = (overrides: Partial<ChecklistItem> = {}): ChecklistItem => {
  n += 1;
  return {
    id: `item-${n}`,
    tripId: 't',
    title: `Item ${n}`,
    category: 'todo',
    assignedTo: null,
    done: false,
    completedBy: null,
    completedAt: null,
    createdBy: 'alex',
    createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
    ...overrides,
  };
};

describe('ChecklistModel.fromRow / toInsertRow', () => {
  const row: ChecklistItemRow = {
    id: 'a',
    trip_id: 't',
    title: 'Passports',
    category: 'packing',
    assigned_to: 'sam',
    done: true,
    completed_by: 'alex',
    completed_at: '2026-02-01T10:00:00Z',
    created_by: 'sam',
    created_at: '2026-01-01T00:00:00Z',
  };

  it('maps a row to the domain shape', () => {
    expect(ChecklistModel.fromRow(row)).toEqual({
      id: 'a',
      tripId: 't',
      title: 'Passports',
      category: 'packing',
      assignedTo: 'sam',
      done: true,
      completedBy: 'alex',
      completedAt: '2026-02-01T10:00:00Z',
      createdBy: 'sam',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('falls back to to-do for a missing or unknown category', () => {
    expect(ChecklistModel.fromRow({ ...row, category: null }).category).toBe('todo');
    expect(ChecklistModel.fromRow({ ...row, category: 'mystery' }).category).toBe('todo');
  });

  it('writes only the editable columns, never the completion stamp', () => {
    const insert = ChecklistModel.toInsertRow('t', { title: 'Tickets', category: 'booking', assignedTo: null });
    expect(insert).toEqual({ trip_id: 't', title: 'Tickets', category: 'booking', assigned_to: null });
    expect(Object.keys(insert)).not.toContain('completed_by');
  });
});

describe('ChecklistModel.sort', () => {
  it('puts open items first, then orders by when they were added', () => {
    const first = item();
    const second = item({ done: true });
    const third = item();
    expect(ChecklistModel.sort([second, third, first]).map((i) => i.id)).toEqual([first.id, third.id, second.id]);
  });

  it('does not change the list it is given', () => {
    const list = [item({ done: true }), item()];
    const copy = [...list];
    ChecklistModel.sort(list);
    expect(list).toEqual(copy);
  });
});

describe('ChecklistModel.groupByCategory', () => {
  it('groups in a fixed order and leaves out empty categories', () => {
    const booking = item({ category: 'booking' });
    const packing = item({ category: 'packing' });
    const groups = ChecklistModel.groupByCategory([booking, packing]);
    expect(groups.map((g) => g.category)).toEqual(['packing', 'booking']);
    expect(groups[0].items).toEqual([packing]);
  });
});

describe('ChecklistModel.progress', () => {
  it('counts finished items', () => {
    const p = ChecklistModel.progress([item({ done: true }), item(), item({ done: true }), item()]);
    expect(p).toMatchObject({ done: 2, total: 4, fraction: 0.5, label: '2 of 4 done' });
  });

  it('says so when everything is done', () => {
    expect(ChecklistModel.progress([item({ done: true }), item({ done: true })]).label).toBe('All 2 done');
  });

  it('handles an empty list without dividing by zero', () => {
    expect(ChecklistModel.progress([])).toEqual({ done: 0, total: 0, fraction: null, label: 'Nothing on the list yet' });
  });
});

describe('ChecklistModel.canDelete', () => {
  it('lets the author delete', () => {
    expect(ChecklistModel.canDelete(item({ createdBy: 'alex' }), trip, 'alex')).toBe(true);
  });

  it('lets an organizer delete anyone’s item', () => {
    expect(ChecklistModel.canDelete(item({ createdBy: 'alex' }), trip, 'sam')).toBe(true);
  });

  it('stops other members, and signed-out callers', () => {
    expect(ChecklistModel.canDelete(item({ createdBy: 'sam' }), trip, 'alex')).toBe(false);
    expect(ChecklistModel.canDelete(item({ createdBy: null }), trip, 'alex')).toBe(false);
    expect(ChecklistModel.canDelete(item({ createdBy: 'alex' }), trip, null)).toBe(false);
  });
});

describe('ChecklistModel.detailLine', () => {
  it('shows an open, unassigned item as unassigned', () => {
    expect(ChecklistModel.detailLine(item(), trip, 'sam')).toBe('Unassigned');
  });

  it('names the assignee, or "you"', () => {
    expect(ChecklistModel.detailLine(item({ assignedTo: 'alex' }), trip, 'sam')).toBe('Assigned to Alex Kim');
    expect(ChecklistModel.detailLine(item({ assignedTo: 'sam' }), trip, 'sam')).toBe('Assigned to you');
  });

  it('shows who finished a done item next to who it was assigned to', () => {
    const done = item({ done: true, completedBy: 'alex', assignedTo: 'sam' });
    expect(ChecklistModel.detailLine(done, trip, 'sam')).toBe('Done by Alex Kim · Assigned to you');
  });

  it('copes with people who have no name or have left the trip', () => {
    expect(ChecklistModel.detailLine(item({ assignedTo: 'jo' }), trip, 'sam')).toBe('Assigned to Trip member');
    expect(ChecklistModel.detailLine(item({ done: true, completedBy: 'gone' }), trip, 'sam')).toBe('Done by a former member');
    expect(ChecklistModel.detailLine(item({ done: true, completedBy: null }), trip, 'sam')).toBe('Done');
  });
});
