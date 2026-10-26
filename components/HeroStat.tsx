import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { BudgetMeter } from './BudgetMeter';
import { Icon, IconName } from './Icon';
import { Reveal } from './Reveal';

interface HeroStatProps {
  /** Small caps label above the figure. */
  eyebrow: string;
  /** The big number. */
  figure: string;
  /** Smaller text beside the figure, e.g. "of $1,500.00". */
  figureNote?: string;
  /** 0 to 1 draws a meter. The status line always says the same in words. */
  fraction?: number | null;
  /** The stub line, always words. */
  status: string;
  statusIcon?: IconName;
  /** One spoken sentence for the whole card. */
  accessibilityLabel: string;
}

/**
 * The Trip Hub's boarding-pass look for a tab's headline number: a navy card with the figure and meter,
 * and a lighter stub that says what it means in words. Decorative parts are hidden from screen readers.
 */
export function HeroStat({
  eyebrow,
  figure,
  figureNote,
  fraction,
  status,
  statusIcon,
  accessibilityLabel,
}: HeroStatProps) {
  const { colors, spacing, radii } = useTheme();
  return (
    <Reveal>
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={[styles.card, { backgroundColor: colors.hero, borderRadius: radii.xl }]}
      >
        <View
          style={{
            padding: spacing.lg,
            paddingBottom: spacing.md,
            gap: spacing.xs,
          }}
        >
          <AppText variant="caption" color="onHeroSecondary" style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </AppText>
          <View style={[styles.amount, { gap: spacing.xs }]}>
            <AppText variant="display" color="onHero" tabular>
              {figure}
            </AppText>
            {figureNote ? (
              <AppText variant="callout" color="onHeroSecondary" tabular>
                {figureNote}
              </AppText>
            ) : null}
          </View>
          {fraction !== undefined && fraction !== null ? (
            <View style={{ marginTop: spacing.xs }}>
              <BudgetMeter fraction={fraction} />
            </View>
          ) : null}
        </View>
        <View
          style={[
            styles.stub,
            {
              backgroundColor: colors.heroPanel,
              padding: spacing.md,
              gap: spacing.xs,
            },
          ]}
        >
          {statusIcon ? <Icon name={statusIcon} size={20} color="heroAccent" /> : null}
          <AppText variant="headline" color="onHero" style={styles.status}>
            {status}
          </AppText>
        </View>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  eyebrow: { letterSpacing: 1.4 },
  amount: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  stub: { flexDirection: 'row', alignItems: 'center' },
  status: { flexShrink: 1 },
});
