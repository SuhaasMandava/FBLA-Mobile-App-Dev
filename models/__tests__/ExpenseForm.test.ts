import {
  emptyExpenseForm,
  ExpenseFormValues,
  expenseToFormValues,
  previewSplits,
  validateExpenseForm,
} from '../ExpenseForm';
import { Expense } from '../ExpenseModel';

const members = ['sam', 'alex', 'jo'];
const context = { memberIds: members };

const valid = (overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues => ({
  ...emptyExpenseForm('sam', members),
  description: 'Dinner at the pier',
  amount: '90',
  ...overrides,
});

function errorsOf(values: ExpenseFormValues) {
  const result = validateExpenseForm(values, context);
  if (result.ok) throw new Error('expected the form to be rejected');
  return result.errors;
}

function dataOf(values: ExpenseFormValues) {
  const result = validateExpenseForm(values, context);
  if (!result.ok) throw new Error(`expected the form to pass: ${JSON.stringify(result.errors)}`);
  return result.data;
}

describe('validateExpenseForm: syntactic rules', () => {
  it('requires a description and trims it', () => {
    expect(errorsOf(valid({ description: '   ' })).description).toBe('Description is required.');
    expect(dataOf(valid({ description: '  Gas  ' })).description).toBe('Gas');
  });

  it('limits the description to 80 characters', () => {
    expect(errorsOf(valid({ description: 'x'.repeat(81) })).description).toMatch(/under 80/);
    expect(dataOf(valid({ description: 'x'.repeat(80) })).description).toHaveLength(80);
  });

  it('requires an amount', () => {
    expect(errorsOf(valid({ amount: '' })).amount).toBe('Amount is required.');
  });

  it('rejects amounts that are not dollars and cents', () => {
    for (const amount of ['abc', '12.345', '1.2.3', '-5', '1e3']) {
      expect(errorsOf(valid({ amount })).amount).toBe('Enter an amount like 42 or 42.50.');
    }
  });

  it('accepts the ways people type money', () => {
    expect(dataOf(valid({ amount: '$1,234.5' })).amountCents).toBe(123_450);
    expect(dataOf(valid({ amount: ' 19.99 ' })).amountCents).toBe(1_999);
  });

  it('rejects share counts that are not whole numbers from 0 to 99', () => {
    for (const bad of ['1.5', '-1', '100', 'two']) {
      const errors = errorsOf(valid({ splitMode: 'shares', shares: { sam: bad, alex: '1', jo: '1' } }));
      expect(errors.shares).toBe('Shares are whole numbers from 0 to 99.');
    }
  });
});

describe('validateExpenseForm: semantic rules', () => {
  it('rejects a zero amount and one over the cap', () => {
    expect(errorsOf(valid({ amount: '0' })).amount).toBe('Amount must be more than $0.');
    expect(errorsOf(valid({ amount: '0.00' })).amount).toBe('Amount must be more than $0.');
    expect(errorsOf(valid({ amount: '1000000.01' })).amount).toMatch(/can't be more than \$1,000,000/);
  });

  it('requires whoever paid to be on the trip', () => {
    expect(errorsOf(valid({ paidBy: '' })).paidBy).toBe('Choose who paid.');
    expect(errorsOf(valid({ paidBy: 'stranger' })).paidBy).toBe('That person is no longer on this trip.');
  });

  it('needs someone to split an even expense with, all on the trip', () => {
    expect(errorsOf(valid({ included: [] })).included).toBe('Choose at least one person to split with.');
    expect(errorsOf(valid({ included: ['sam', 'stranger'] })).included).toBe('Someone in the split is no longer on this trip.');
  });

  it('needs at least one share above zero', () => {
    const errors = errorsOf(valid({ splitMode: 'shares', shares: { sam: '0', alex: '', jo: '0' } }));
    expect(errors.shares).toBe('Give at least one person a share.');
  });

  it('ignores the rule for the split mode not in use', () => {
    // Shares are invalid, but the expense is split evenly, so they don't matter.
    expect(validateExpenseForm(valid({ shares: { sam: 'x' } }), context).ok).toBe(true);
  });

  it('shows one message per field', () => {
    const errors = errorsOf(valid({ description: '', amount: 'x', paidBy: '' }));
    expect(Object.keys(errors).sort()).toEqual(['amount', 'description', 'paidBy']);
  });
});

describe('validateExpenseForm: splits', () => {
  it('splits evenly among the people included, in roster order, to the exact cent', () => {
    const data = dataOf(valid({ amount: '10', included: ['jo', 'sam', 'alex'] }));
    expect(data.splits).toEqual({ sam: 334, alex: 333, jo: 333 });
    expect(data.shares).toBeNull();
  });

  it('leaves out people who are not included', () => {
    expect(dataOf(valid({ amount: '50', included: ['sam', 'jo'] })).splits).toEqual({ sam: 2500, jo: 2500 });
  });

  it('splits by shares and keeps the weights, dropping zero shares', () => {
    const data = dataOf(valid({ amount: '100', splitMode: 'shares', shares: { sam: '2', alex: '1', jo: '0' } }));
    expect(data.splits).toEqual({ sam: 6667, alex: 3333 });
    expect(data.shares).toEqual({ sam: 2, alex: 1 });
  });

  it('always produces splits that add up to the amount', () => {
    for (const amount of ['0.01', '0.02', '1', '33.33', '99.99', '1234.56']) {
      for (const shares of [{ sam: '1', alex: '1', jo: '1' }, { sam: '3', alex: '7', jo: '11' }]) {
        const even = dataOf(valid({ amount }));
        const weighted = dataOf(valid({ amount, splitMode: 'shares', shares }));
        for (const data of [even, weighted]) {
          expect(Object.values(data.splits).reduce((a, b) => a + b, 0)).toBe(data.amountCents);
        }
      }
    }
  });
});

describe('previewSplits', () => {
  it('previews each person’s share as the form is filled in', () => {
    expect(previewSplits(valid({ amount: '30' }), context)).toEqual({ sam: 1000, alex: 1000, jo: 1000 });
  });

  it('shows nothing until the amount and split make sense', () => {
    expect(previewSplits(valid({ amount: '' }), context)).toBeNull();
    expect(previewSplits(valid({ amount: '0' }), context)).toBeNull();
    expect(previewSplits(valid({ included: [] }), context)).toBeNull();
    expect(previewSplits(valid({ splitMode: 'shares', shares: { sam: '0' } }), context)).toBeNull();
  });
});

describe('expenseToFormValues', () => {
  const base: Expense = {
    id: 'e1',
    tripId: 't1',
    paidBy: 'alex',
    description: 'Cabin',
    amountCents: 30_000,
    category: 'lodging',
    splits: { sam: 20_000, alex: 10_000 },
    shares: { sam: 2, alex: 1 },
    createdAt: '2026-10-12T18:00:00Z',
  };

  it('restores a split by shares', () => {
    const values = expenseToFormValues(base, members);
    expect(values).toMatchObject({ amount: '300.00', splitMode: 'shares', paidBy: 'alex', category: 'lodging' });
    expect(values.shares).toEqual({ sam: '2', alex: '1', jo: '0' });
  });

  it('restores an even split and round-trips through validation', () => {
    const even = { ...base, shares: null, splits: { sam: 15_000, jo: 15_000 } };
    const values = expenseToFormValues(even, members);
    expect(values.splitMode).toBe('even');
    expect(values.included).toEqual(['sam', 'jo']);
    expect(dataOf(values).splits).toEqual(even.splits);
  });

  it('drops people who have left the trip', () => {
    const values = expenseToFormValues({ ...base, shares: null, splits: { sam: 15_000, gone: 15_000 } }, members);
    expect(values.included).toEqual(['sam']);
  });
});
