import { ReactNode } from 'react';
import { AccessibilityActionEvent, AccessibilityActionInfo, Pressable, StyleSheet, View } from 'react-native';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface ListRowProps {
  title: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** Small line above the title, e.g. a day and time. */
  overline?: string;
  /** Trailing text such as an amount. */
  value?: string;
  /** Icon, avatar, or Route stop drawn at the leading edge. */
  leading?: ReactNode;
  /** `chevron` for rows that open something, `check` for the selected choice, or any element (a Badge). */
  trailing?: 'chevron' | 'check' | ReactNode;
  onPress?: () => void;
  /** Spoken label for the whole row. Defaults to the visible text joined together. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  selected?: boolean;
  /** Red title for destructive rows like Sign Out. */
  destructive?: boolean;
  /** Content after the text, inside the row (e.g. reorder buttons). Not part of the row's tap target. */
  accessory?: ReactNode;
}

/** One row of a grouped list. At least 44 pt tall; trailing content moves under the title at large text sizes. */
export function ListRow({
  title,
  subtitle,
  overline,
  value,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  selected,
  destructive = false,
  accessory,
}: ListRowProps) {
  const { colors, spacing, layout, motion } = useTheme();
  const largeText = useLargeText();
  const spoken = accessibilityLabel ?? [overline, title, subtitle, value].filter(Boolean).join(', ');

  const trailingNode =
    trailing === 'chevron' ? (
      <Icon name="chevron-forward" size={18} color="labelSecondary" />
    ) : trailing === 'check' ? (
      <Icon name="checkmark" size={22} color="accent" />
    ) : (
      trailing
    );

  const body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={[styles.main, largeText && styles.mainStacked, { gap: spacing.xs }]}>
        <View style={styles.text}>
          {overline ? (
            <AppText variant="subheadStrong" color="labelSecondary" tabular>
              {overline}
            </AppText>
          ) : null}
          <AppText variant="body" color={destructive ? 'danger' : 'label'}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="subhead" color="labelSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {value ? (
          <AppText variant="body" color="labelSecondary" tabular>
            {value}
          </AppText>
        ) : null}
      </View>
      {trailingNode ? <View style={styles.trailing}>{trailingNode}</View> : null}
    </>
  );

  const rowStyle = {
    minHeight: layout.minTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    gap: spacing.sm,
  };

  return (
    <View style={[styles.outer, selected && { backgroundColor: colors.accentTint }]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityHint={accessibilityHint}
          accessibilityState={selected === undefined ? undefined : { selected }}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={onAccessibilityAction}
          onPress={onPress}
          style={({ pressed }) => [styles.row, rowStyle, pressed && { opacity: motion.pressedOpacity }]}
        >
          {body}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={spoken}
          accessibilityHint={accessibilityHint}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={onAccessibilityAction}
          style={[styles.row, rowStyle]}
        >
          {body}
        </View>
      )}
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flexDirection: 'row', alignItems: 'stretch' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  leading: { alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mainStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  text: { flexShrink: 1, gap: 2 },
  trailing: { alignItems: 'center', justifyContent: 'center' },
});
