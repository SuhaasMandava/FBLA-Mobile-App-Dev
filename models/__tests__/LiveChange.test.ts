import { applyLiveChange, LiveChange } from '../LiveChange';

interface Item {
  id: string;
  title: string;
  position: number;
}
interface Row {
  id: string;
  title: string;
  position: number;
}

const fromRow = (row: Row): Item => ({ ...row });
const sort = (items: Item[]) => [...items].sort((a, b) => a.position - b.position);
const apply = (items: Item[], change: LiveChange<Row>) => applyLiveChange(items, change, fromRow, sort);

const list: Item[] = [
  { id: 'a', title: 'Hike', position: 1 },
  { id: 'b', title: 'Lunch', position: 2 },
];

describe('applyLiveChange', () => {
  it('adds a new row in sorted order', () => {
    const next = apply(list, { type: 'upsert', row: { id: 'c', title: 'Breakfast', position: 0 } });
    expect(next.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('replaces an edited row and re-sorts', () => {
    const next = apply(list, { type: 'upsert', row: { id: 'a', title: 'Long hike', position: 3 } });
    expect(next).toEqual([
      { id: 'b', title: 'Lunch', position: 2 },
      { id: 'a', title: 'Long hike', position: 3 },
    ]);
  });

  it('is harmless when the echo of your own change arrives', () => {
    const mine = apply(list, { type: 'upsert', row: { id: 'c', title: 'Dinner', position: 3 } });
    const echoed = apply(mine, { type: 'upsert', row: { id: 'c', title: 'Dinner', position: 3 } });
    expect(echoed).toEqual(mine);
    expect(echoed).toHaveLength(3);
  });

  it('removes a deleted row', () => {
    expect(apply(list, { type: 'delete', id: 'a' }).map((i) => i.id)).toEqual(['b']);
  });

  it("returns the same list for a delete that isn't in it (deletes arrive for every trip)", () => {
    expect(apply(list, { type: 'delete', id: 'someone-elses' })).toBe(list);
  });

  it('never changes the list it was given', () => {
    apply(list, { type: 'upsert', row: { id: 'a', title: 'Changed', position: 9 } });
    apply(list, { type: 'delete', id: 'b' });
    expect(list).toEqual([
      { id: 'a', title: 'Hike', position: 1 },
      { id: 'b', title: 'Lunch', position: 2 },
    ]);
  });
});
