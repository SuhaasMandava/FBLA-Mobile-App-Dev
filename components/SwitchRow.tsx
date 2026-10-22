import { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * A grouped-list row with an on/off switch, for settings. The whole row is one switch for
 * screen readers ("Activity reminders, switch, on"); the switch moves under the text at large text sizes.
 */
export function SwitchRow({ title, subtitle, leading, value, onValueChange, disabled = false }: SwitchRowProps) {
  const { colors, spacing, layout } = useTheme();
  const largeText = useLargeText();
  return (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ checked: value, disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!disabled) onValueChange(!value);
      }}
      style={[
        styles.row,
        largeText && styles.stacked,
        { minHeight: layout.minTarget, paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, gap: spacing.sm },
      ]}
    >
      <View style={[styles.main, { gap: spacing.sm }]}>
        {leading}
        <View style={styles.text}>
          <AppText variant="body" color={disabled ? 'labelSecondary' : 'label'}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="subhead" color="labelSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.accent, false: colors.fieldBorder }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.fieldBorder}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, gap: 2 },
});
