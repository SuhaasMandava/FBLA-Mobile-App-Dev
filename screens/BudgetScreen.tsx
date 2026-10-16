import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { BudgetMeter } from '../components/BudgetMeter';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CATEGORY_ICONS } from '../components/categoryIcons';
import { EmptyState } from '../components/EmptyState';
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
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { BudgetCalculator, BudgetSummary } from '../models/BudgetCalculator';
import { CATEGORY_LABELS, ExpenseModel } from '../models/ExpenseModel';
import { Trip, TripModel } from '../models/TripModel';
import { formatDayHeading, toISODate } from '../utils/dates';
import { formatCents } from '../utils/money';
import { TabScreenNavigation } from './types';

/** Spent vs. budget on the navy hero card. The status line always says it in words, with an icon when over. */
function SummaryCard({ summary }: { summary: BudgetSummary }) {
  const { spacing } = useTheme();
  const hasBudget = summary.budgetCents > 0;
  const status = !hasBudget
    ? 'No budget set for this trip'
    : summary.overBudget
      ? `Over budget by ${formatCents(-summary.remainingCents)}`
      : `${formatCents(summary.remainingCents)} left`;
  const spoken = `Spent ${formatCents(summary.spentCents)}${hasBudget ? ` of ${formatCents(summary.budgetCents)}` : ''}. ${status}.`;

  return (
    <Card variant="hero" accessible accessibilityLabel={spoken}>
      <AppText variant="subheadStrong" color="onHeroSecondary">
        Spent so far
      </AppText>
      <View style={[styles.amountLine, { gap: spacing.xs }]}>
        <AppText variant="largeTitle" color="onHero" tabular>
          {formatCents(summary.spentCents)}
        </AppText>
        {hasBudget ? (
          <AppText variant="callout" color="onHeroSecondary" tabular>
            {`of ${formatCents(summary.budgetCents)}`}
          </AppText>
        ) : null}
      </View>
      {summary.fractionUsed !== null ? <BudgetMeter fraction={summary.fractionUsed} /> : null}
      <View style={[styles.inline, { gap: spacing.xxs + 2 }]}>
        {summary.overBudget ? <Icon name="alert-circle" size={18} color="heroAccent" /> : null}
        <AppText variant={summary.overBudget ? 'headline' : 'callout'} color="onHero">
          {status}
        </AppText>
      </View>
    </Card>
  );
}

export default function BudgetScreen() {
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { expenses, loading, error, refresh } = useExpenses();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: activeTrip
        ? () => <HeaderButton icon="add" accessibilityLabel="Add expense" onPress={() => navigation.navigate('Expense')} />
        : undefined,
    });
  }, [navigation, activeTrip]);

  const summary = BudgetCalculator.summarize(
    activeTrip?.budgetCents ?? 0,
    expenses.map((e) => e.amountCents),
  );
  const transfers = useMemo(() => BudgetCalculator.settleUp(BudgetCalculator.balances(expenses)), [expenses]);

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

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}

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
              <ListRow leading={<Icon name="checkmark-circle" size={24} color="success" />} title="Everyone's even" />
            ) : (
              transfers.map((t) => (
                <ListRow
                  key={`${t.from}-${t.to}`}
                  leading={<Avatar name={displayNameOf(activeTrip, t.from)} size={32} />}
                  title={`${name(t.from)} ${t.from === userId ? 'pay' : 'pays'} ${t.to === userId ? 'you' : name(t.to)}`}
                  value={formatCents(t.amountCents)}
                />
              ))
            )}
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
                  onPress={editable ? () => navigation.navigate('Expense', { expenseId: expense.id }) : undefined}
                />
              );
            })}
          </ListSection>
        </>
      )}
    </Screen>
  );
}

/** The stored name, for avatars. */
function displayNameOf(trip: Trip, userId: string): string | null {
  return trip.members.find((m) => m.userId === userId)?.displayName ?? null;
}

/** "You", the member's name, or "Former member" for someone who has left the trip. */
function personName(trip: Trip, id: string, me: string | null): string {
  if (id === me) return 'You';
  const member = trip.members.find((m) => m.userId === id);
  return member ? TripModel.memberName(member) : 'Former member';
}

const styles = StyleSheet.create({
  amountLine: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center' },
});
