import { CHECKLIST_TITLE_MAX, QUICK_ADD_MAX_ITEMS, validateQuickAdd } from '../ChecklistForm';

function titlesOf(text: string) {
  const result = validateQuickAdd(text, 'packing');
  if (!result.ok) throw new Error(`expected quick add to pass: ${JSON.stringify(result.errors)}`);
  return result.data.map((i) => i.title);
}

function errorOf(text: string) {
  const result = validateQuickAdd(text, 'packing');
  if (result.ok) throw new Error('expected quick add to be rejected');
  return result.errors.text;
}

describe('validateQuickAdd', () => {
  it('adds one trimmed item, in the chosen group, unassigned', () => {
    expect(validateQuickAdd('  Sunscreen  ', 'booking')).toEqual({
      ok: true,
      data: [{ title: 'Sunscreen', category: 'booking', assignedTo: null }],
    });
  });

  it('turns a pasted list into one item per line', () => {
    expect(titlesOf('Passports\nSunscreen\r\nPhone charger')).toEqual(['Passports', 'Sunscreen', 'Phone charger']);
  });

  it('drops bullets, numbers and checkboxes people paste', () => {
    expect(titlesOf('- Hat\n• Socks\n* Towel\n1. Snacks\n2) Map\n[ ] Tent\n[x] Stove')).toEqual([
      'Hat',
      'Socks',
      'Towel',
      'Snacks',
      'Map',
      'Tent',
      'Stove',
    ]);
  });

  it('keeps numbers that are part of the item', () => {
    expect(titlesOf('3 pairs of socks\n2 water bottles')).toEqual(['3 pairs of socks', '2 water bottles']);
  });

  it('skips blank lines and repeats (ignoring case)', () => {
    expect(titlesOf('Hat\n\n  \nhat\nHAT\nSocks')).toEqual(['Hat', 'Socks']);
  });

  it('needs something to add', () => {
    expect(errorOf('')).toBe('Type an item to add.');
    expect(errorOf(' \n - \n')).toBe('Type an item to add.');
  });

  it(`limits a paste to ${QUICK_ADD_MAX_ITEMS} items`, () => {
    const many = Array.from({ length: QUICK_ADD_MAX_ITEMS + 1 }, (_, i) => `Item ${i}`).join('\n');
    expect(errorOf(many)).toBe(`Add up to ${QUICK_ADD_MAX_ITEMS} items at a time.`);
    expect(titlesOf(many.split('\n').slice(1).join('\n'))).toHaveLength(QUICK_ADD_MAX_ITEMS);
  });

  it('applies the same length rule as the full form, to every line', () => {
    expect(errorOf(`Hat\n${'x'.repeat(CHECKLIST_TITLE_MAX + 1)}`)).toMatch(/under 100 characters/);
    expect(titlesOf('x'.repeat(CHECKLIST_TITLE_MAX))).toHaveLength(1);
  });
});
