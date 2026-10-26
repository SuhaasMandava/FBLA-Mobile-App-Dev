import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useController } from 'react-hook-form';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CATEGORY_ICONS } from '../components/categoryIcons';
import { ChoiceChips } from '../components/ChoiceChips';
import { ControlledTextField } from '../components/ControlledTextField';
import { EmptyState } from '../components/EmptyState';
import { FieldMessage } from '../components/FieldMessage';
import { InlineBanner } from '../components/InlineBanner';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { useAuth } from '../hooks/useAuth';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useExpenses } from '../hooks/useExpenses';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { MAX_SHARE, SplitMode } from '../models/ExpenseForm';
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, Expense, ExpenseModel } from '../models/ExpenseModel';
import { TripMember, TripModel } from '../models/TripModel';
import { confirmDestructive } from '../utils/confirm';
import { formatCents } from '../utils/money';
import { RootNavigation, RootStackParamList } from './types';

/** Add or edit one expense. The route's `expenseId` selects edit mode. */
export default function ExpenseScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { expenses } = useExpenses();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Expense'>>();
  const expense = params?.expenseId ? expenses.find((e) => e.id === params.expenseId) : undefined;

  // Opened for an expense that's gone (deleted on another phone) or with no trip selected.
  if (!activeTrip || (params?.expenseId && !expense)) {
    return (
      <EmptyState title="This expense is gone" body="Someone may have removed it. Go back and pull down to refresh.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  if (expense && !ExpenseModel.canEdit(expense, activeTrip, userId)) {
    return (
      <EmptyState title="You can't change this expense" body="Only whoever paid, or the trip organizer, can edit or delete it.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <ExpenseForm key={expense?.id ?? 'new'} expense={expense} />;
}

const categoryOptions = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
  icon: CATEGORY_ICONS[value],
}));

const splitOptions: { value: SplitMode; label: string }[] = [
  { value: 'even', label: 'Evenly' },
  { value: 'shares', label: 'By Shares' },
];

function ExpenseForm({ expense }: { expense?: Expense }) {
  const navigation = useNavigation<RootNavigation>();
  const { spacing } = useTheme();
  const [done, setDone] = useState(false);
  const form = useExpenseForm({ expense, onDone: () => setDone(true) });
  useDiscardGuard(form.control, done, () => navigation.goBack());

  const category = useController({ control: form.control, name: 'category' });
  const paidBy = useController({ control: form.control, name: 'paidBy' });
  const splitMode = useController({ control: form.control, name: 'splitMode' });
  const included = useController({ control: form.control, name: 'included' });
  const shares = useController({ control: form.control, name: 'shares' });

  const nameOf = (member: TripMember) => (member.userId === form.userId ? 'You' : TripModel.memberName(member));
  const owes = (id: string) => {
    const cents = form.preview?.[id];
    return cents === undefined ? undefined : formatCents(cents);
  };
  const payer = form.members.find((m) => m.userId === form.values.paidBy);

  const toggleIncluded = (id: string) => {
    const current: string[] = included.field.value;
    included.field.onChange(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };
  const setShare = (id: string, value: number) => shares.field.onChange({ ...shares.field.value, [id]: String(value) });
  const shareOf = (id: string) => {
    const raw = (shares.field.value as Record<string, string>)[id];
    return raw && /^\d+$/.test(raw) ? Number(raw) : 0;
  };

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${expense?.description}"?`,
      message: 'It will be removed from the budget and settle-up for everyone on the trip.',
      confirmLabel: 'Delete Expense',
      onConfirm: form.remove,
    });

  const splitError = splitMode.field.value === 'even' ? included.fieldState.error?.message : shares.fieldState.error?.message;

  return (
    <Sheet
      footer={
        <>
          <Button
            label={expense ? 'Save Changes' : 'Add Expense'}
            onPress={form.submit}
            loading={form.submitting}
            disabled={form.deleting}
          />
          {expense ? (
            <Button
              label="Delete Expense"
              variant="destructive"
              icon="trash-outline"
              onPress={confirmDelete}
              loading={form.deleting}
              disabled={form.submitting}
            />
          ) : null}
        </>
      }
    >
      <ControlledTextField
        control={form.control}
        name="description"
        label="Description"
        placeholder="e.g. Dinner at the pier"
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      <ControlledTextField
        control={form.control}
        name="amount"
        label="Amount"
        placeholder="0.00"
        helper="In dollars, e.g. 42.50"
        keyboardType="decimal-pad"
        inputMode="decimal"
      />

      <View style={{ gap: spacing.xs }}>
        <SectionHeader title="Category" />
        <ChoiceChips label="Category" options={categoryOptions} value={category.field.value} onChange={category.field.onChange} />
      </View>

      {form.canChoosePayer ? (
        <ListSection header="Paid By" footer="As organizer, you can log an expense for anyone on the trip.">
          {form.members.map((member) => (
            <ListRow
              key={member.userId}
              leading={<Avatar name={member.displayName} size={32} />}
              title={nameOf(member)}
              trailing={member.userId === paidBy.field.value ? 'check' : undefined}
              selected={member.userId === paidBy.field.value}
              onPress={() => paidBy.field.onChange(member.userId)}
            />
          ))}
        </ListSection>
      ) : (
        <ListSection header="Paid By" footer="You can log what you paid. The organizer can log expenses for anyone.">
          <ListRow
            leading={<Avatar name={payer?.displayName ?? null} size={32} />}
            title={payer ? nameOf(payer) : 'You'}
          />
        </ListSection>
      )}
      <FieldMessage error={paidBy.fieldState.error?.message} />

      <View style={{ gap: spacing.xs }}>
        <SectionHeader title="Split" />
        <SegmentedControl options={splitOptions} value={splitMode.field.value} onChange={splitMode.field.onChange} />
        <AppText variant="footnote" color="labelSecondary">
          {splitMode.field.value === 'even'
            ? 'Evenly: everyone you pick pays the same. Any leftover cent goes to one person so the total is exact.'
            : 'By Shares: give bigger shares to people who use more, like 2 for a couple sharing a room and 1 for one person.'}
        </AppText>
      </View>

      {splitMode.field.value === 'even' ? (
        <ListSection footer="Tap people to include or leave them out.">
          {form.members.map((member) => {
            const isIn = (included.field.value as string[]).includes(member.userId);
            return (
              <ListRow
                key={member.userId}
                leading={<Avatar name={member.displayName} size={32} />}
                title={nameOf(member)}
                value={isIn ? owes(member.userId) : 'Not included'}
                trailing={isIn ? 'check' : undefined}
                selected={isIn}
                accessibilityHint={isIn ? 'Leaves them out of this expense' : 'Includes them in this expense'}
                onPress={() => toggleIncluded(member.userId)}
              />
            );
          })}
        </ListSection>
      ) : (
        <ListSection footer={`Give each person a number of shares, from 0 to ${MAX_SHARE}. A couple might take 2.`}>
          {form.members.map((member) => (
            <ListRow
              key={member.userId}
              leading={<Avatar name={member.displayName} size={32} />}
              title={nameOf(member)}
              subtitle={owes(member.userId) ?? (shareOf(member.userId) === 0 ? 'Not included' : undefined)}
              accessory={
                // Outside the row's own accessibility element, so the stepper stays separately adjustable.
                <View style={[styles.accessory, { paddingRight: spacing.md }]}>
                  <Stepper
                    label={`${nameOf(member)}, shares`}
                    value={shareOf(member.userId)}
                    max={MAX_SHARE}
                    onChange={(value) => setShare(member.userId, value)}
                  />
                </View>
              }
            />
          ))}
        </ListSection>
      )}
      <FieldMessage error={splitError} />

      {form.preview ? (
        <AppText variant="footnote" color="labelSecondary" style={{ paddingHorizontal: spacing.md }}>
          {`The split always adds up to exactly ${formatCents(
            Object.values(form.preview).reduce((sum, cents) => sum + cents, 0),
          )}, down to the cent.`}
        </AppText>
      ) : null}

      {form.overBudgetByCents > 0 ? (
        <InlineBanner tone="warning" message={`Saving this puts the trip ${formatCents(form.overBudgetByCents)} over budget.`} />
      ) : null}

      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  accessory: { justifyContent: 'center' },
});
