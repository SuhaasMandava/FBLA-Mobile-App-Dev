import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import {
  emptyExpenseForm,
  ExpenseFormValues,
  expenseToFormValues,
  previewSplits,
  validateExpenseForm,
} from '../models/ExpenseForm';
import { Expense, NewExpense } from '../models/ExpenseModel';
import { TripModel } from '../models/TripModel';
import { normalizeDollarInput, parseDollarsToCents } from '../utils/money';
import { createResolver } from '../utils/formResolver';
import { useAuth } from './useAuth';
import { useExpenses } from './useExpenses';
import { useTrip } from './useTrip';

interface Options {
  /** The expense being edited; leave out to add a new one. */
  expense?: Expense;
  /** Runs once the expense is saved or deleted. */
  onDone: () => void;
}

/** Form state and save/delete logic for adding or editing an expense, checked against the active trip's members and budget. */
export function useExpenseForm({ expense, onDone }: Options) {
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses();
  const members = activeTrip?.members ?? [];
  const memberIds = members.map((m) => m.userId);
  const context = { memberIds };

  const form = useForm<ExpenseFormValues, unknown, NewExpense>({
    defaultValues: expense ? expenseToFormValues(expense, memberIds) : emptyExpenseForm(userId ?? '', memberIds),
    resolver: createResolver((values) => validateExpenseForm(values, context)),
    reValidateMode: 'onChange',
  });
  const values = useWatch({ control: form.control }) as ExpenseFormValues;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // How far over budget the trip would be once this expense is saved (0 if it stays within budget, or there's no budget).
  const budgetCents = activeTrip?.budgetCents ?? 0;
  const enteredCents = parseDollarsToCents(normalizeDollarInput(values.amount ?? '')) ?? 0;
  const otherSpending = expenses.filter((e) => e.id !== expense?.id).reduce((sum, e) => sum + e.amountCents, 0);
  const overBudgetByCents = budgetCents > 0 ? Math.max(0, otherSpending + enteredCents - budgetCents) : 0;

  const fail = (message: string) => {
    setSubmitError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = form.handleSubmit(
    async (data) => {
      setSubmitError(null);
      const result = expense ? await updateExpense(expense.id, data) : await addExpense(data);
      if (result.ok) onDone();
      else fail(result.error);
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      if (typeof first === 'string') AccessibilityInfo.announceForAccessibility(first);
    },
  );

  /** Delete the expense being edited. Returns after calling onDone, or after showing why it failed. */
  const remove = async () => {
    if (!expense || deleting) return;
    setSubmitError(null);
    setDeleting(true);
    const result = await deleteExpense(expense.id);
    setDeleting(false);
    if (result.ok) onDone();
    else fail(result.error);
  };

  return {
    control: form.control,
    setValue: form.setValue,
    values,
    preview: previewSplits(values, context),
    members,
    userId,
    /** Organizers may log an expense for anyone; everyone else logs what they paid. */
    canChoosePayer: activeTrip ? TripModel.isOrganizer(activeTrip, userId) : false,
    overBudgetByCents,
    submit,
    remove,
    submitting: form.formState.isSubmitting,
    deleting,
    submitError,
  };
}
