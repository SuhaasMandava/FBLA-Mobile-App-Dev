import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useTrip } from '../hooks/useTrip';
import { formatCents } from '../utils/money';
import { TabScreenNavigation } from './types';

/** Expense tracking isn't built yet. The tab stays (tabs are never hidden) and says what's coming. */
export default function BudgetScreen() {
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip } = useTrip();

  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Create or join a trip to see its budget.">
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
      </EmptyState>
    );
  }

  const total = activeTrip.budgetCents > 0 ? formatCents(activeTrip.budgetCents) : null;
  return (
    <EmptyState
      title={total ? `Budget: ${total}` : 'No budget set'}
      body="Logging expenses and splitting costs with your group is coming soon."
    />
  );
}
