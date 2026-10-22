import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ChecklistProgress as Progress } from '../models/ChecklistModel';
import { AppText } from './AppText';
import { BudgetMeter } from './BudgetMeter';
import { Card } from './Card';
import { Icon } from './Icon';

/** How much of the trip's checklist is done, on the navy hero card. The count is always written out; the bar only repeats it. */
export function ChecklistProgress({ progress }: { progress: Progress }) {
  const { spacing } = useTheme();
  const complete = progress.total > 0 && progress.done === progress.total;
  return (
    <Card variant="hero" accessible accessibilityLabel={progress.label}>
      <AppText variant="subheadStrong" color="onHeroSecondary">
        Trip checklist
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {complete ? <Icon name="checkmark-circle" size={28} color="heroAccent" /> : null}
        <AppText variant="title1" color="onHero" tabular>
          {progress.label}
        </AppText>
      </View>
      {progress.fraction !== null ? <BudgetMeter fraction={progress.fraction} /> : null}
    </Card>
  );
}
