import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { BudgetMeter } from './BudgetMeter';
import { Icon, IconName } from './Icon';

interface GlanceTileProps {
  icon: IconName;
  /** Small label: "Budget". */
  label: string;
  /** The figure or title the tile is about. */
  value: string;
  /** Line under the value. */
  caption?: string;
  /** 0 to 1 draws a meter under the caption. The words always say the same thing. */
  fraction?: number | null;
  /** Show the value and meter as a warning (e.g. over budget). The caption must say why. */
  alert?: boolean;
  /** Overrides the spoken label. Defaults to the visible text joined together. */
  accessibilityLabel?: string;
  hint: string;
  onPress: () => void;
  children?: ReactNode;
}

/** One at-a-glance fact on the Trip Hub that opens the screen it comes from. */
export function GlanceTile({
  icon,
  label,
  value,
  caption,
  fraction,
  alert = false,
  accessibilityLabel,
  hint,
  onPress,
  children,
}: GlanceTileProps) {
  const { colors, spacing, radii, layout, motion } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [label, value, caption].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.xs,
          minHeight: layout.minTarget,
          borderColor: alert ? colors.danger : colors.separator,
        },
        pressed && { opacity: motion.pressedOpacity, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.head, { gap: spacing.xs }]}>
        <View style={[styles.badge, { backgroundColor: colors.accentTint }]}>
          <Icon name={alert ? 'alert-circle' : icon} size={16} color={alert ? 'danger' : 'onAccentTint'} />
        </View>
        <AppText variant="subheadStrong" color="labelSecondary" style={styles.label}>
          {label}
        </AppText>
      </View>
      <AppText variant="stat" color={alert ? 'danger' : 'label'} tabular>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="subhead" color="labelSecondary">
          {caption}
        </AppText>
      ) : null}
      {fraction !== undefined && fraction !== null ? (
        <View style={{ marginTop: spacing.xxs }}>
          <BudgetMeter fraction={fraction} tone={alert ? 'alert' : 'surface'} />
        </View>
      ) : null}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1 },
});
