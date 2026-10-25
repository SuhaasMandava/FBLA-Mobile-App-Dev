import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { Screen } from '../components/Screen';
import { useAuth } from '../hooks/useAuth';
import { useChecklist } from '../hooks/useChecklist';
import { useExpenses } from '../hooks/useExpenses';
import { useItinerary } from '../hooks/useItinerary';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { BudgetCalculator } from '../models/BudgetCalculator';
import { ChecklistModel } from '../models/ChecklistModel';
import { formatCents } from '../utils/money';
import { displayNameOf, personName } from '../utils/names';
import { RootNavigation } from './types';

/** "1 activity" / "5 activities". */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The end-of-trip recap: what the group spent against its budget, what each person paid and
 * their share, whether everyone is settled up, and how much of the plan and checklist got done.
 * Everything is worked out from data the other tabs already load.
 */
export default function TripSummaryScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { spacing } = useTheme();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { expenses, settlements } = useExpenses();
  const { items: activities } = useItinerary();
  const { items: checklist } = useChecklist();

  const payments = useMemo(
    () => settlements.map((s) => ({ from: s.fromUser, to: s.toUser, amountCents: s.amountCents })),
    [settlements],
  );
  const summary = BudgetCalculator.summarize(
    activeTrip?.budgetCents ?? 0,
    expenses.map((e) => e.amountCents),
  );
  const people = useMemo(() => {
    const totals = BudgetCalculator.totalsByPerson(expenses);
    const net = BudgetCalculator.balances(expenses, payments);
    return Object.keys(totals)
      .map((id) => ({ id, ...totals[id], netCents: net[id] ?? 0 }))
      .sort((a, b) => b.paidCents - a.paidCents || a.id.localeCompare(b.id));
  }, [expenses, payments]);
  const stillOwed = useMemo(() => BudgetCalculator.settleUp(BudgetCalculator.balances(expenses, payments)), [expenses, payments]);

  if (!activeTrip) {
    return <EmptyState title="No trip selected" body="Pick a trip to see its summary." />;
  }

  const name = (id: string) => personName(activeTrip, id, userId);
  const progress = ChecklistModel.progress(checklist);
  const settled = stillOwed.length === 0;
  const hasBudget = summary.budgetCents > 0;
  const budgetLine = !hasBudget
    ? 'No budget was set'
    : summary.overBudget
      ? `Over budget by ${formatCents(-summary.remainingCents)}`
      : `${formatCents(summary.remainingCents)} under budget`;
  const perPerson = activeTrip.members.length > 0 ? Math.round(summary.spentCents / activeTrip.members.length) : 0;
  const spoken = `${activeTrip.name}. Total spent ${formatCents(summary.spentCents)}. ${budgetLine}.`;

  return (
    <Screen>
      <Card variant="hero" accessible accessibilityLabel={spoken}>
        <AppText variant="subheadStrong" color="onHeroSecondary">
          {activeTrip.name}
        </AppText>
        <AppText variant="largeTitle" color="onHero" tabular>
          {formatCents(summary.spentCents)}
        </AppText>
        <View style={[styles.inline, { gap: spacing.xxs + 2 }]}>
          {summary.overBudget ? <Icon name="alert-circle" size={18} color="heroAccent" /> : null}
          <AppText variant="callout" color="onHero">
            {hasBudget ? `${budgetLine} (${formatCents(summary.budgetCents)})` : budgetLine}
          </AppText>
        </View>
        {expenses.length > 0 ? (
          <AppText variant="callout" color="onHeroSecondary">
            {`About ${formatCents(perPerson)} each across ${count(activeTrip.members.length, 'traveler', 'travelers')}`}
          </AppText>
        ) : null}
      </Card>

      <ListSection header="Settling Up">
        <ListRow
          leading={<Icon name={settled ? 'checkmark-circle' : 'time'} size={24} color={settled ? 'success' : 'labelSecondary'} />}
          title={
            expenses.length === 0
              ? 'No expenses were logged'
              : settled
                ? "Everyone's settled up"
                : `${count(stillOwed.length, 'payment', 'payments')} still to make`
          }
          subtitle={settlements.length > 0 ? `${count(settlements.length, 'payment', 'payments')} marked as paid` : undefined}
          trailing="chevron"
          accessibilityHint="Goes back to the Budget tab"
          onPress={() => navigation.goBack()}
        />
      </ListSection>

      {people.length > 0 ? (
        <ListSection header="Who Paid What" footer="Share is each person's part of the group's spending. Balance includes payments marked as paid.">
          {people.map((person) => (
            <ListRow
              key={person.id}
              leading={<Avatar name={displayNameOf(activeTrip, person.id)} size={32} />}
              title={name(person.id)}
              subtitle={`Paid ${formatCents(person.paidCents)} · share ${formatCents(person.shareCents)}`}
              value={person.netCents === 0 ? 'Even' : person.netCents > 0 ? `Owed ${formatCents(person.netCents)}` : `Owes ${formatCents(-person.netCents)}`}
            />
          ))}
        </ListSection>
      ) : null}

      <ListSection header="The Plan">
        <ListRow
          leading={<Icon name="map" size={24} color="labelSecondary" />}
          title={count(activities.length, 'activity', 'activities')}
          subtitle={`${count(daysWithPlans(activities), 'day', 'days')} with plans`}
        />
        <ListRow leading={<Icon name="checkbox" size={24} color="labelSecondary" />} title="Checklist" subtitle={progress.label} />
      </ListSection>
    </Screen>
  );
}

/** How many different days have at least one activity. */
function daysWithPlans(activities: { day: string }[]): number {
  return new Set(activities.map((a) => a.day)).size;
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center' },
});
