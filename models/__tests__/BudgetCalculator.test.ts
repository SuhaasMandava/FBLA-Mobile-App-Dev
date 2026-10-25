import { BudgetCalculator, Splits, Transfer } from '../BudgetCalculator';

const sum = (splits: Splits) => Object.values(splits).reduce((total, cents) => total + cents, 0);

/** Apply the payments to the balances: everyone should end at zero. */
function settle(balances: Splits, transfers: Transfer[]): Splits {
  const left = { ...balances };
  for (const t of transfers) {
    left[t.from] += t.amountCents;
    left[t.to] -= t.amountCents;
  }
  return left;
}

describe('BudgetCalculator.splitEvenly', () => {
  it('splits a total that divides cleanly', () => {
    expect(BudgetCalculator.splitEvenly(9000, ['a', 'b', 'c'])).toEqual({ a: 3000, b: 3000, c: 3000 });
  });

  it('gives leftover cents to the first people, in order', () => {
    expect(BudgetCalculator.splitEvenly(1000, ['a', 'b', 'c'])).toEqual({ a: 334, b: 333, c: 333 });
    expect(BudgetCalculator.splitEvenly(1001, ['a', 'b', 'c'])).toEqual({ a: 334, b: 334, c: 333 });
  });

  it('always adds up to the exact total', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    for (let total = 0; total <= 5000; total += 37) {
      for (let n = 1; n <= people.length; n++) {
        expect(sum(BudgetCalculator.splitEvenly(total, people.slice(0, n)))).toBe(total);
      }
    }
  });

  it('handles one cent across many people', () => {
    expect(BudgetCalculator.splitEvenly(1, ['a', 'b', 'c'])).toEqual({ a: 1, b: 0, c: 0 });
  });

  it('rejects an empty group, fractional cents and negative totals', () => {
    expect(() => BudgetCalculator.splitEvenly(100, [])).toThrow(RangeError);
    expect(() => BudgetCalculator.splitEvenly(10.5, ['a'])).toThrow(RangeError);
    expect(() => BudgetCalculator.splitEvenly(-100, ['a'])).toThrow(RangeError);
  });
});

describe('BudgetCalculator.splitByShare', () => {
  it('splits by weight', () => {
    expect(BudgetCalculator.splitByShare(9000, { couple: 2, solo: 1 })).toEqual({ couple: 6000, solo: 3000 });
  });

  it('sends leftover cents to the largest remainders', () => {
    // Exact shares are 666.67 and 333.33: the larger remainder gets the extra cent.
    expect(BudgetCalculator.splitByShare(1000, { a: 2, b: 1 })).toEqual({ a: 667, b: 333 });
  });

  it('lets someone take a zero share', () => {
    expect(BudgetCalculator.splitByShare(1000, { a: 1, b: 0 })).toEqual({ a: 1000, b: 0 });
  });

  it('always adds up to the exact total', () => {
    const weights: Record<string, number>[] = [{ a: 3, b: 1, c: 7 }, { a: 1, b: 99 }, { a: 5, b: 5, c: 5, d: 1 }];
    for (const shares of weights) {
      for (let total = 1; total <= 10_000; total += 113) {
        expect(sum(BudgetCalculator.splitByShare(total, shares))).toBe(total);
      }
    }
  });

  it('rejects all-zero and negative shares', () => {
    expect(() => BudgetCalculator.splitByShare(100, { a: 0, b: 0 })).toThrow(RangeError);
    expect(() => BudgetCalculator.splitByShare(100, { a: -1, b: 2 })).toThrow(RangeError);
  });
});

describe('BudgetCalculator.summarize', () => {
  it('reports what is left under budget', () => {
    expect(BudgetCalculator.summarize(150_000, [40_000, 20_000])).toEqual({
      spentCents: 60_000,
      budgetCents: 150_000,
      remainingCents: 90_000,
      overBudget: false,
      fractionUsed: 0.4,
    });
  });

  it('flags spending over the budget', () => {
    const summary = BudgetCalculator.summarize(10_000, [7_500, 5_000]);
    expect(summary.overBudget).toBe(true);
    expect(summary.remainingCents).toBe(-2_500);
    expect(summary.fractionUsed).toBe(1.25);
  });

  it('is not over budget at exactly the budget', () => {
    expect(BudgetCalculator.summarize(10_000, [10_000]).overBudget).toBe(false);
  });

  it('has no fraction or over-budget state without a budget', () => {
    const summary = BudgetCalculator.summarize(0, [5_000]);
    expect(summary.fractionUsed).toBeNull();
    expect(summary.overBudget).toBe(false);
  });
});

describe('BudgetCalculator.balances', () => {
  it('credits the payer and debits everyone in the split', () => {
    const balances = BudgetCalculator.balances([
      { paidBy: 'a', amountCents: 9000, splits: { a: 3000, b: 3000, c: 3000 } },
      { paidBy: 'b', amountCents: 3000, splits: { a: 1500, b: 1500 } },
    ]);
    expect(balances).toEqual({ a: 4500, b: -1500, c: -3000 });
    expect(sum(balances)).toBe(0);
  });

  it('skips an expense whose splits do not add up', () => {
    const balances = BudgetCalculator.balances([{ paidBy: 'a', amountCents: 1000, splits: { a: 500, b: 400 } }]);
    expect(balances).toEqual({});
  });
});

describe('BudgetCalculator.settleUp', () => {
  it('needs no payments when everyone is even', () => {
    expect(BudgetCalculator.settleUp({})).toEqual([]);
    expect(BudgetCalculator.settleUp({ a: 0, b: 0 })).toEqual([]);
  });

  it('settles a simple debt with one payment', () => {
    expect(BudgetCalculator.settleUp({ a: 2500, b: -2500 })).toEqual([{ from: 'b', to: 'a', amountCents: 2500 }]);
  });

  it('settles one payer and three debtors in three payments', () => {
    const balances = { a: 9000, b: -3000, c: -3000, d: -3000 };
    const transfers = BudgetCalculator.settleUp(balances);
    expect(transfers).toHaveLength(3);
    expect(Object.values(settle(balances, transfers)).every((c) => c === 0)).toBe(true);
  });

  it('finds the fewest payments where pairing largest-with-largest would need more', () => {
    // Two groups that each add up to zero: {a, b, c} and {d, e}. Matching the biggest
    // debtor with the biggest creditor straight away (e pays a) mixes them and takes 4
    // payments; keeping the groups apart takes 2 + 1 = 3.
    const balances = { a: 700, b: -400, c: -300, d: 600, e: -600 };
    const transfers = BudgetCalculator.settleUp(balances);
    expect(transfers).toHaveLength(3);
    expect(transfers).toContainEqual({ from: 'e', to: 'd', amountCents: 600 });
    expect(Object.values(settle(balances, transfers)).every((c) => c === 0)).toBe(true);
  });

  it('uses n - 1 payments when no smaller group adds up to zero', () => {
    const balances = { a: 500, b: 200, c: -400, d: -300 };
    expect(BudgetCalculator.settleUp(balances)).toHaveLength(3);
  });

  it('never makes a payment of zero or less, and always settles everyone', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (let seed = 1; seed <= 200; seed++) {
      // Deterministic pseudo-random balances that add up to zero.
      const balances: Splits = {};
      let running = 0;
      people.forEach((id, i) => {
        const value = i === people.length - 1 ? -running : ((seed * 7919 * (i + 3)) % 20_001) - 10_000;
        balances[id] = value;
        running += value;
      });
      const transfers = BudgetCalculator.settleUp(balances);
      const nonZero = people.filter((id) => balances[id] !== 0).length;
      expect(transfers.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
      expect(transfers.every((t) => t.amountCents > 0 && t.from !== t.to)).toBe(true);
      expect(Object.values(settle(balances, transfers)).every((c) => c === 0)).toBe(true);
    }
  });

  it('gives the same payments for the same balances', () => {
    const balances = { a: 1000, b: 1000, c: -1000, d: -1000 };
    expect(BudgetCalculator.settleUp(balances)).toEqual(BudgetCalculator.settleUp({ ...balances }));
  });

  it('works end to end from expenses', () => {
    const balances = BudgetCalculator.balances([
      { paidBy: 'sam', amountCents: 12_000, splits: BudgetCalculator.splitEvenly(12_000, ['sam', 'alex', 'jo']) },
      { paidBy: 'alex', amountCents: 3_000, splits: BudgetCalculator.splitEvenly(3_000, ['sam', 'alex', 'jo']) },
    ]);
    // sam paid 120, owes 50 → +70; alex paid 30, owes 50 → −20; jo owes 50 → −50.
    expect(BudgetCalculator.settleUp(balances)).toEqual([
      { from: 'jo', to: 'sam', amountCents: 5_000 },
      { from: 'alex', to: 'sam', amountCents: 2_000 },
    ]);
  });

  it('rejects balances that do not add up to zero or are not whole cents', () => {
    expect(() => BudgetCalculator.settleUp({ a: 100, b: -50 })).toThrow(RangeError);
    expect(() => BudgetCalculator.settleUp({ a: 0.5, b: -0.5 })).toThrow(RangeError);
  });
});

describe('BudgetCalculator.balances with recorded payments', () => {
  const expenses = [{ paidBy: 'a', amountCents: 9000, splits: { a: 3000, b: 3000, c: 3000 } }];

  it('moves balances toward zero when someone has paid', () => {
    const balances = BudgetCalculator.balances(expenses, [{ from: 'b', to: 'a', amountCents: 3000 }]);
    expect(balances).toEqual({ a: 3000, b: 0, c: -3000 });
    expect(sum(balances)).toBe(0);
  });

  it('reaches zero for everyone once every suggested payment is recorded', () => {
    const transfers = BudgetCalculator.settleUp(BudgetCalculator.balances(expenses));
    const balances = BudgetCalculator.balances(expenses, transfers);
    expect(Object.values(balances).every((cents) => cents === 0)).toBe(true);
    expect(BudgetCalculator.settleUp(balances)).toEqual([]);
  });

  it('settles only what is left after a part payment', () => {
    const balances = BudgetCalculator.balances(expenses, [{ from: 'c', to: 'a', amountCents: 1000 }]);
    expect(BudgetCalculator.settleUp(balances)).toEqual(
      expect.arrayContaining([
        { from: 'b', to: 'a', amountCents: 3000 },
        { from: 'c', to: 'a', amountCents: 2000 },
      ]),
    );
  });

  it('is unchanged without payments', () => {
    expect(BudgetCalculator.balances(expenses, [])).toEqual(BudgetCalculator.balances(expenses));
  });
});

describe('BudgetCalculator.totalsByPerson', () => {
  it('adds what each person paid and their share', () => {
    const totals = BudgetCalculator.totalsByPerson([
      { paidBy: 'a', amountCents: 9000, splits: { a: 3000, b: 3000, c: 3000 } },
      { paidBy: 'b', amountCents: 3000, splits: { a: 1500, b: 1500 } },
    ]);
    expect(totals).toEqual({
      a: { paidCents: 9000, shareCents: 4500 },
      b: { paidCents: 3000, shareCents: 4500 },
      c: { paidCents: 0, shareCents: 3000 },
    });
  });

  it('skips an expense whose splits do not add up', () => {
    expect(BudgetCalculator.totalsByPerson([{ paidBy: 'a', amountCents: 1000, splits: { a: 500 } }])).toEqual({});
  });
});
