import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * How much of the budget is spent, as a filled bar on the navy hero card. Decorative, like
 * the Route drawn there: the text next to it says the amounts, and "Over budget" is always
 * written out with an icon, never shown by the bar alone.
 */
export function BudgetMeter({ fraction }: { fraction: number }) {
  const { colors, radii } = useTheme();
  const filled = Math.min(Math.max(fraction, 0), 1);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, { borderRadius: radii.pill }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.trackFill, { backgroundColor: colors.onHeroSecondary }]} />
      <View style={{ width: `${filled * 100}%`, height: '100%', borderRadius: radii.pill, backgroundColor: colors.heroAccent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, overflow: 'hidden' },
  trackFill: { opacity: 0.25 },
});
