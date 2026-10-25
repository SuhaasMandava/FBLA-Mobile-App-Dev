/**
 * Pure budget math. All amounts are integer cents; every split sums exactly
 * to the input total (leftover cents go to the largest fractional remainders,
 * ties broken by input order). No React, no network.
 */
export type Splits = Record<string, number>;

/** One payment that squares the group up: `from` pays `to`. */
export interface Transfer {
  from: string;
  to: string;
  amountCents: number;
}

/** Where the trip stands against its budget. */
export interface BudgetSummary {
  spentCents: number;
  /** 0 means the trip has no budget. */
  budgetCents: number;
  /** Budget minus spent. Negative once the trip is over budget. */
  remainingCents: number;
  overBudget: boolean;
  /** Spent as a fraction of the budget (can pass 1), or null with no budget. */
  fractionUsed: number | null;
}

/** The parts of an expense the math needs. */
export interface ExpenseShare {
  paidBy: string;
  amountCents: number;
  splits: Splits;
}

/** Above this many people with a balance, settle-up falls back to the greedy pairing (still correct, maybe one or two extra payments). */
const MAX_EXACT_SETTLE = 15;

export class BudgetCalculator {
  /** Split `totalCents` equally across `memberIds`. */
  static splitEvenly(totalCents: number, memberIds: string[]): Splits {
    const shares: Splits = {};
    for (const id of memberIds) shares[id] = 1;
    return BudgetCalculator.splitByShare(totalCents, shares);
  }

  /**
   * Split `totalCents` proportionally to `shares` (e.g. { a: 2, b: 1 } → a pays
   * two thirds). Shares are relative weights and must be non-negative.
   */
  static splitByShare(totalCents: number, shares: Record<string, number>): Splits {
    if (!Number.isInteger(totalCents) || totalCents < 0) {
      throw new RangeError('totalCents must be a non-negative integer');
    }
    const ids = Object.keys(shares);
    if (ids.length === 0) throw new RangeError('At least one member is required');
    if (ids.some((id) => !(shares[id] >= 0))) {
      throw new RangeError('Shares must be non-negative numbers');
    }
    const totalShares = ids.reduce((sum, id) => sum + shares[id], 0);
    if (totalShares <= 0) throw new RangeError('Total shares must be greater than zero');

    const exact = ids.map((id) => (totalCents * shares[id]) / totalShares);
    const result: Splits = {};
    let allocated = 0;
    ids.forEach((id, i) => {
      result[id] = Math.floor(exact[i]);
      allocated += result[id];
    });

    const byRemainder = ids
      .map((id, i) => ({ id, i, rem: exact[i] - Math.floor(exact[i]) }))
      .sort((a, b) => b.rem - a.rem || a.i - b.i);
    for (let n = 0; n < totalCents - allocated; n++) {
      result[byRemainder[n % byRemainder.length].id] += 1;
    }
    return result;
  }

  /** Total spent against the trip's budget (`budgetCents` 0 = no budget). */
  static summarize(budgetCents: number, amountsCents: number[]): BudgetSummary {
    const spentCents = amountsCents.reduce((sum, cents) => sum + cents, 0);
    const remainingCents = budgetCents - spentCents;
    return {
      spentCents,
      budgetCents,
      remainingCents,
      overBudget: budgetCents > 0 && remainingCents < 0,
      fractionUsed: budgetCents > 0 ? spentCents / budgetCents : null,
    };
  }

  /**
   * Each person's net position across the expenses: what they paid minus what
   * they owe. Positive = the group owes them; negative = they owe the group.
   * The balances always add up to zero. An expense whose splits don't add up
   * to its amount (which the database refuses) is skipped rather than
   * throwing the whole group off. Recorded payments (`payments`, "A paid B") move
   * the balances toward zero: A's goes up by the amount and B's goes down.
   */
  static balances(expenses: ExpenseShare[], payments: Transfer[] = []): Splits {
    const net: Splits = {};
    const add = (id: string, cents: number) => {
      net[id] = (net[id] ?? 0) + cents;
    };
    for (const expense of expenses) {
      const owed = Object.values(expense.splits).reduce((sum, cents) => sum + cents, 0);
      if (owed !== expense.amountCents) continue;
      add(expense.paidBy, expense.amountCents);
      for (const [id, cents] of Object.entries(expense.splits)) add(id, -cents);
    }
    for (const payment of payments) {
      add(payment.from, payment.amountCents);
      add(payment.to, -payment.amountCents);
    }
    return net;
  }

  /** What each person paid out and what their share of the spending came to, for the end-of-trip summary. */
  static totalsByPerson(expenses: ExpenseShare[]): Record<string, { paidCents: number; shareCents: number }> {
    const totals: Record<string, { paidCents: number; shareCents: number }> = {};
    const entry = (id: string) => (totals[id] ??= { paidCents: 0, shareCents: 0 });
    for (const expense of expenses) {
      const owed = Object.values(expense.splits).reduce((sum, cents) => sum + cents, 0);
      if (owed !== expense.amountCents) continue;
      entry(expense.paidBy).paidCents += expense.amountCents;
      for (const [id, cents] of Object.entries(expense.splits)) entry(id).shareCents += cents;
    }
    return totals;
  }

  /**
   * The fewest payments that bring every balance to zero.
   *
   * n people with a balance can always settle in n - 1 payments, but a group that
   * splits into k smaller groups that each add up to zero needs only n - k. So the
   * minimum comes from finding as many zero-sum groups as possible (an exact
   * search over subsets, fine for trip-sized groups), then settling each group by
   * repeatedly pairing its largest debtor with its largest creditor.
   * Balances must be whole cents and add up to zero.
   */
  static settleUp(balances: Splits): Transfer[] {
    const people = Object.keys(balances).filter((id) => balances[id] !== 0);
    if (people.some((id) => !Number.isInteger(balances[id]))) {
      throw new RangeError('Balances must be whole cents');
    }
    if (people.reduce((sum, id) => sum + balances[id], 0) !== 0) {
      throw new RangeError('Balances must add up to zero');
    }
    if (people.length === 0) return [];

    const groups = people.length <= MAX_EXACT_SETTLE ? zeroSumGroups(people, balances) : [people];
    return groups.flatMap((group) => settleGroup(group, balances));
  }
}

/**
 * Split `people` into the largest possible number of groups whose balances add
 * up to zero. dp[mask] is the most zero-sum groups that the people in `mask`
 * can be cut into when they're removed one at a time; every time the people
 * still left add up to zero, one group closes.
 */
function zeroSumGroups(people: string[], balances: Splits): string[][] {
  const n = people.length;
  const full = (1 << n) - 1;
  const sums = new Float64Array(1 << n);
  const dp = new Int16Array(1 << n);
  const removed = new Int8Array(1 << n); // which person dp[mask] removes first

  for (let mask = 1; mask <= full; mask++) {
    const lowest = 31 - Math.clz32(mask & -mask);
    sums[mask] = sums[mask & (mask - 1)] + balances[people[lowest]];

    let best = -1;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) && dp[mask ^ (1 << i)] > best) {
        best = dp[mask ^ (1 << i)];
        removed[mask] = i;
      }
    }
    dp[mask] = best + (sums[mask] === 0 ? 1 : 0);
  }

  // Walk the best removal order back; the people removed between two zero-sum points form one group.
  const groups: string[][] = [];
  let group: string[] = [];
  for (let mask = full; mask !== 0; ) {
    const i = removed[mask];
    group.push(people[i]);
    mask ^= 1 << i;
    if (sums[mask] === 0) {
      groups.push(group);
      group = [];
    }
  }
  // Keep each group in the caller's order, so the same balances always give the same payments.
  return groups.map((g) => people.filter((id) => g.includes(id)));
}

/** Settle one zero-sum group: the largest debtor pays the largest creditor until everyone is even. */
function settleGroup(group: string[], balances: Splits): Transfer[] {
  const left = new Map(group.map((id) => [id, balances[id]]));
  const transfers: Transfer[] = [];
  const largest = (sign: 1 | -1) =>
    group.reduce<string | null>((best, id) => {
      const value = (left.get(id) as number) * sign;
      return value > 0 && (best === null || value > (left.get(best) as number) * sign) ? id : best;
    }, null);

  for (let debtor = largest(-1), creditor = largest(1); debtor && creditor; debtor = largest(-1), creditor = largest(1)) {
    const amountCents = Math.min(-(left.get(debtor) as number), left.get(creditor) as number);
    transfers.push({ from: debtor, to: creditor, amountCents });
    left.set(debtor, (left.get(debtor) as number) + amountCents);
    left.set(creditor, (left.get(creditor) as number) - amountCents);
  }
  return transfers;
}
