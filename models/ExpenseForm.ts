import { z } from 'zod';
import { normalizeDollarInput, parseDollarsToCents } from '../utils/money';
import { BudgetCalculator, Splits } from './BudgetCalculator';
import { EXPENSE_CATEGORIES, Expense, ExpenseCategory, NewExpense } from './ExpenseModel';
import { MAX_BUDGET_DOLLARS } from './TripForm';
import { firstIssuePerField, Validation } from './validation';

export const EXPENSE_DESCRIPTION_MAX = 80;
/** Largest single expense: the same cap as a trip budget. */
export const MAX_EXPENSE_DOLLARS = MAX_BUDGET_DOLLARS;
export const MAX_SHARE = 99;

export type SplitMode = 'even' | 'shares';

/** Raw values from the expense form. Amount and shares are text until validated. */
export interface ExpenseFormValues {
  description: string;
  amount: string;
  category: ExpenseCategory;
  paidBy: string;
  splitMode: SplitMode;
  /** Who shares the cost when it's split evenly. */
  included: string[];
  /** Each member's weight when it's split by shares ("2" for a couple). Blank counts as 0. */
  shares: Record<string, string>;
}

/** The current trip members, in roster order. The order decides who gets a leftover cent, so results are repeatable. */
export interface ExpenseFormContext {
  memberIds: string[];
}

/** A fresh form: you paid, split evenly with everyone, one share each. */
export function emptyExpenseForm(userId: string, memberIds: string[]): ExpenseFormValues {
  return {
    description: '',
    amount: '',
    category: 'food',
    paidBy: userId,
    splitMode: 'even',
    included: [...memberIds],
    shares: Object.fromEntries(memberIds.map((id) => [id, '1'])),
  };
}

/** The form as it was filled in for an existing expense. People who left the trip are dropped from the split. */
export function expenseToFormValues(expense: Expense, memberIds: string[]): ExpenseFormValues {
  const shares = expense.shares;
  return {
    description: expense.description,
    amount: (expense.amountCents / 100).toFixed(2),
    category: expense.category,
    paidBy: expense.paidBy,
    splitMode: shares ? 'shares' : 'even',
    included: memberIds.filter((id) => id in expense.splits),
    shares: Object.fromEntries(memberIds.map((id) => [id, String(shares ? (shares[id] ?? 0) : id in expense.splits ? 1 : 0)])),
  };
}

const SHARE_PATTERN = /^\d{1,2}$/;
const shareValue = (raw: string | undefined) => (raw === undefined || raw.trim() === '' ? 0 : Number(raw.trim()));

/** The weights to split by, for members with a share above zero (null if any share isn't a whole number 0-99). */
function sharesToWeights(values: ExpenseFormValues, memberIds: string[]): Record<string, number> | null {
  const weights: Record<string, number> = {};
  for (const id of memberIds) {
    const raw = (values.shares[id] ?? '').trim();
    if (raw !== '' && !SHARE_PATTERN.test(raw)) return null;
    const weight = shareValue(raw);
    if (weight > 0) weights[id] = weight;
  }
  return weights;
}

/**
 * What each person would owe with the form as it stands, for the live preview
 * next to each name. Null until the amount and split are valid enough to compute.
 */
export function previewSplits(values: ExpenseFormValues, { memberIds }: ExpenseFormContext): Splits | null {
  const cents = parseDollarsToCents(normalizeDollarInput(values.amount));
  if (cents === null || cents <= 0) return null;
  if (values.splitMode === 'even') {
    const included = memberIds.filter((id) => values.included.includes(id));
    return included.length > 0 ? BudgetCalculator.splitEvenly(cents, included) : null;
  }
  const weights = sharesToWeights(values, memberIds);
  return weights && Object.keys(weights).length > 0 ? BudgetCalculator.splitByShare(cents, weights) : null;
}

/**
 * Syntactic rules live on the fields (required, length, amount format, whole-number
 * shares); semantic rules relate them to each other and to the trip (the payer and
 * everyone in the split must be on the trip, someone must share the cost).
 */
function expenseSchema({ memberIds }: ExpenseFormContext) {
  const onTrip = (id: string) => memberIds.includes(id);
  return z
    .object({
      description: z
        .string()
        .trim()
        .min(1, 'Description is required.')
        .max(EXPENSE_DESCRIPTION_MAX, `Keep the description under ${EXPENSE_DESCRIPTION_MAX} characters.`),
      amount: z
        .string()
        .min(1, 'Amount is required.')
        .refine((v) => v === '' || parseDollarsToCents(v) !== null, 'Enter an amount like 42 or 42.50.')
        .refine((v) => parseDollarsToCents(v) !== 0, 'Amount must be more than $0.')
        .refine(
          (v) => {
            const cents = parseDollarsToCents(v);
            return cents === null || cents <= MAX_EXPENSE_DOLLARS * 100;
          },
          `An expense can't be more than $${MAX_EXPENSE_DOLLARS.toLocaleString('en-US')}.`,
        ),
      category: z.enum(EXPENSE_CATEGORIES, 'Pick a category.'),
      paidBy: z.string().min(1, 'Choose who paid.').refine(onTrip, 'That person is no longer on this trip.'),
      splitMode: z.enum(['even', 'shares']),
      included: z.array(z.string()),
      shares: z.record(z.string(), z.string()),
    })
    .superRefine((v, ctx) => {
      if (v.splitMode === 'even') {
        if (v.included.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['included'], message: 'Choose at least one person to split with.' });
        } else if (!v.included.every(onTrip)) {
          ctx.addIssue({ code: 'custom', path: ['included'], message: 'Someone in the split is no longer on this trip.' });
        }
        return;
      }
      const entries = memberIds.map((id) => (v.shares[id] ?? '').trim());
      if (entries.some((raw) => raw !== '' && !SHARE_PATTERN.test(raw))) {
        ctx.addIssue({ code: 'custom', path: ['shares'], message: `Shares are whole numbers from 0 to ${MAX_SHARE}.` });
      } else if (entries.every((raw) => shareValue(raw) === 0)) {
        ctx.addIssue({ code: 'custom', path: ['shares'], message: 'Give at least one person a share.' });
      }
    });
}

/** Validate the form against the trip's members and, if it passes, return the expense with its splits worked out. */
export function validateExpenseForm(
  values: ExpenseFormValues,
  context: ExpenseFormContext,
): Validation<ExpenseFormValues, NewExpense> {
  const input = { ...values, amount: normalizeDollarInput(values.amount) };
  const result = expenseSchema(context).safeParse(input);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };

  const data = result.data;
  const amountCents = parseDollarsToCents(data.amount) as number; // already proven valid by the schema
  const weights = data.splitMode === 'shares' ? (sharesToWeights(data, context.memberIds) as Record<string, number>) : null;
  const splits = weights
    ? BudgetCalculator.splitByShare(amountCents, weights)
    : BudgetCalculator.splitEvenly(
        amountCents,
        context.memberIds.filter((id) => data.included.includes(id)),
      );

  return {
    ok: true,
    data: {
      description: data.description,
      amountCents,
      category: data.category,
      paidBy: data.paidBy,
      splits,
      shares: weights,
    },
  };
}
