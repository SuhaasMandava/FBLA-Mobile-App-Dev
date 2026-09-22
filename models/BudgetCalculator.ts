/**
 * Pure budget-splitting math. All amounts are integer cents; every split sums
 * exactly to the input total (leftover cents go to the largest fractional
 * remainders, ties broken by input order).
 */
export type Splits = Record<string, number>;

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
}
