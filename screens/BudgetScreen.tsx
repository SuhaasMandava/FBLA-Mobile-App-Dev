import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CATEGORY_ICONS } from '../components/categoryIcons';
import { EmptyState } from '../components/EmptyState';
import { HeroStat } from '../components/HeroStat';
import { HeaderButton } from '../components/HeaderButton';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { OfflineBanner } from '../components/OfflineBanner';
import { Screen } from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { useTrip } from '../hooks/useTrip';
import { BudgetCalculator, BudgetSummary } from '../models/BudgetCalculator';
import { CATEGORY_LABELS, ExpenseModel } from '../models/ExpenseModel';
import { SettlementModel } from '../models/SettlementModel';
import { confirmDestructive } from '../utils/confirm';
import { formatDayHeading, toISODate } from '../utils/dates';
import { formatCents } from '../utils/money';
import { displayNameOf, personName } from '../utils/names';
import { TabScreenNavigation } from './types';

/** Spent vs. budget on the navy hero card. The status line always says it in words, with an icon when over. */
function SummaryCard({ summary }: { summary: BudgetSummary }) {
  const hasBudget = summary.budgetCents > 0;
  const status = !hasBudget
    ? 'No budget set for this trip'
    : summary.overBudget
      ? `Over budget by ${formatCents(-summary.remainingCents)}`
      : `${formatCents(summary.remainingCents)} left`;
  const spoken = `Spent ${formatCents(summary.spentCents)}${hasBudget ? ` of ${formatCents(summary.budgetCents)}` : ''}. ${status}.`;

  return (
    <HeroStat
      eyebrow="Spent so far"
      figure={formatCents(summary.spentCents)}
      figureNote={hasBudget ? `of ${formatCents(summary.budgetCents)}` : undefined}
      fraction={summary.fractionUsed}
      status={status}
      statusIcon={summary.overBudget ? 'alert-circle' : hasBudget ? 'wallet-outline' : 'information-circle-outline'}
      accessibilityLabel={spoken}
    />
  );
}

export default function BudgetScreen() {
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { expenses, loading, error, refresh, settlements, recordPayment, undoPayment } = useExpenses();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: activeTrip
        ? () => (
            <HeaderButton icon="add" accessibilityLabel="Add expense" onPress={() => navigation.navigate('Expense')} />
          )
        : undefined,
    });
  }, [navigation, activeTrip]);

  const summary = BudgetCalculator.summarize(
    activeTrip?.budgetCents ?? 0,
    expenses.map((e) => e.amountCents),
  );
  const transfers = useMemo(
    () =>
      BudgetCalculator.settleUp(
        BudgetCalculator.balances(
          expenses,
          settlements.map((s) => ({
            from: s.fromUser,
            to: s.toUser,
            amountCents: s.amountCents,
          })),
        ),
      ),
    [expenses, settlements],
  );

  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Create or join a trip to track what the group spends.">
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
        <Button label="Join with Code" variant="tinted" onPress={() => navigation.navigate('JoinTrip')} />
      </EmptyState>
    );
  }
  if (loading && expenses.length === 0) {
    return (
      <Screen>
        <SkeletonList rows={4} label="Loading expenses" />
      </Screen>
    );
  }
  if (error && expenses.length === 0) {
    return (
      <EmptyState tone="error" title="Couldn't load expenses" body={error}>
        <Button label="Try Again" onPress={refresh} />
      </EmptyState>
    );
  }

  const name = (id: string) => personName(activeTrip, id, userId);
  const addExpense = () => navigation.navigate('Expense');

  const confirmPaid = (from: string, to: string, amountCents: number) =>
    confirmDestructive({
      title: 'Mark as paid?',
      message: `${name(from)} paid ${name(to)} ${formatCents(amountCents)}. Only confirm money that was actually received. Everyone's balances update.`,
      confirmLabel: 'Mark as Paid',
      destructive: false,
      onConfirm: () =>
        void recordPayment({ fromUser: from, toUser: to, amountCents }).then((r) =>
          setPaymentError(r.ok ? null : r.error),
        ),
    });

  const confirmUndo = (id: string, from: string, to: string, amountCents: number) =>
    confirmDestructive({
      title: 'Undo this payment?',
      message: `${name(from)} paid ${name(to)} ${formatCents(amountCents)}. Balances go back to what they were.`,
      confirmLabel: 'Undo Payment',
      onConfirm: () => void undoPayment(id).then((r) => setPaymentError(r.ok ? null : r.error)),
    });

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}

      {paymentError ? <InlineBanner tone="error" message={paymentError} /> : null}

      <SummaryCard summary={summary} />

      {expenses.length === 0 ? (
        <ListSection header="Expenses">
          <EmptyState inline title="No expenses yet" body="Log what you spend and TripHub works out who owes whom.">
            <Button label="Add Expense" variant="tinted" icon="add" onPress={addExpense} />
          </EmptyState>
        </ListSection>
      ) : (
        <>
          <ListSection
            header="Settle Up"
            footer={
              transfers.length > 0
                ? `${transfers.length === 1 ? 'One payment squares' : `${transfers.length} payments square`} everyone up. That's the fewest possible.`
                : undefined
            }
          >
            {transfers.length === 0 ? (
              <ListRow
                leading={<Icon name="checkmark-circle" size={24} color="success" />}
                title={settlements.length > 0 ? "Everyone's settled up" : "Everyone's even"}
              />
            ) : (
              transfers.map((t) => {
                const canMark = SettlementModel.canRecord({ toUser: t.to }, activeTrip, userId);
                return (
                  <ListRow
                    key={`${t.from}-${t.to}`}
                    leading={<Avatar name={displayNameOf(activeTrip, t.from)} size={32} />}
                    title={`${name(t.from)} ${t.from === userId ? 'pay' : 'pays'} ${t.to === userId ? 'you' : name(t.to)}`}
                    value={formatCents(t.amountCents)}
                    trailing={canMark ? 'chevron' : undefined}
                    accessibilityHint={canMark ? 'Marks this payment as received' : undefined}
                    onPress={canMark ? () => confirmPaid(t.from, t.to, t.amountCents) : undefined}
                  />
                );
              })
            )}
          </ListSection>

          {settlements.length > 0 ? (
            <ListSection
              header={`Payments Made · ${settlements.length}`}
              footer="Only the two people involved, or the trip organizer, can undo a payment."
            >
              {settlements.map((payment) => {
                const canUndo = SettlementModel.canManage(payment, activeTrip, userId);
                return (
                  <ListRow
                    key={payment.id}
                    overline={formatDayHeading(toISODate(new Date(payment.createdAt)))}
                    leading={<Icon name="checkmark-circle" size={24} color="success" />}
                    title={`${name(payment.fromUser)} paid ${name(payment.toUser)}`}
                    value={formatCents(payment.amountCents)}
                    trailing={canUndo ? 'chevron' : undefined}
                    accessibilityHint={canUndo ? 'Opens the option to undo this payment' : undefined}
                    onPress={
                      canUndo
                        ? () => confirmUndo(payment.id, payment.fromUser, payment.toUser, payment.amountCents)
                        : undefined
                    }
                  />
                );
              })}
            </ListSection>
          ) : null}

          <ListSection header="Wrap Up">
            <ListRow
              leading={<Icon name="flag" size={24} color="labelSecondary" />}
              title="Trip Summary"
              subtitle="Totals, who paid what, and how the trip went"
              trailing="chevron"
              accessibilityHint="Opens the end-of-trip summary"
              onPress={() => navigation.navigate('TripSummary')}
            />
          </ListSection>

          <ListSection
            header={`Expenses · ${expenses.length}`}
            footer="Only whoever paid, or the trip organizer, can edit or delete an expense."
          >
            {expenses.map((expense) => {
              const editable = ExpenseModel.canEdit(expense, activeTrip, userId);
              const count = ExpenseModel.splitCount(expense);
              return (
                <ListRow
                  key={expense.id}
                  overline={`${formatDayHeading(toISODate(new Date(expense.createdAt)))} · ${CATEGORY_LABELS[expense.category]}`}
                  leading={<Icon name={CATEGORY_ICONS[expense.category]} size={24} color="labelSecondary" />}
                  title={expense.description}
                  subtitle={`Paid by ${name(expense.paidBy)} · ${count === 1 ? 'for 1 person' : `split ${count} ways`}`}
                  value={formatCents(expense.amountCents)}
                  trailing={editable ? 'chevron' : undefined}
                  accessibilityHint={editable ? 'Opens the expense to edit or delete it' : undefined}
                  onPress={
                    editable
                      ? () =>
                          navigation.navigate('Expense', {
                            expenseId: expense.id,
                          })
                      : undefined
                  }
                />
              );
            })}
          </ListSection>
        </>
      )}
    </Screen>
  );
}
