import { StyleSheet, View } from 'react-native';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';

interface SectionHeaderProps {
  title: string;
  /** Optional trailing action, e.g. "See All". */
  action?: { label: string; onPress: () => void; hint?: string };
}

/** Title above a group of rows, announced as a heading. Its action drops below the title at large text sizes. */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { spacing } = useTheme();
  const largeText = useLargeText();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.xxs, gap: spacing.xs }, largeText && styles.stacked]}>
      <AppText variant="title3" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {action ? (
        <Button variant="plain" compact label={action.label} hint={action.hint} onPress={action.onPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  title: { flexShrink: 1 },
});
