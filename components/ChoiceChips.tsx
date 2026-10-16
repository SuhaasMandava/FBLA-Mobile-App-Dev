import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

interface ChoiceChipsProps<T extends string> {
  options: { value: T; label: string; icon: IconName }[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the group, e.g. "Category". */
  label: string;
}

/**
 * Pick one of a handful of choices, shown as wrapping chips. Announced as a radio group.
 * The selected chip gets a tinted fill and a checkmark in place of its icon, so selection isn't color alone.
 */
export function ChoiceChips<T extends string>({ options, value, onChange, label }: ChoiceChipsProps<T>) {
  const { colors, radii, spacing, layout, motion } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.wrap, { gap: spacing.xs }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                minHeight: layout.minTarget,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                gap: spacing.xxs + 2,
                backgroundColor: selected ? colors.accentTint : colors.surface,
                borderColor: selected ? colors.accent : colors.fieldBorder,
                borderWidth: selected ? 2 : 1,
              },
              pressed && { opacity: motion.pressedOpacity },
            ]}
          >
            <Icon name={selected ? 'checkmark' : option.icon} size={18} color={selected ? 'onAccentTint' : 'labelSecondary'} />
            <AppText variant={selected ? 'subheadStrong' : 'subhead'} color={selected ? 'onAccentTint' : 'label'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center' },
});
