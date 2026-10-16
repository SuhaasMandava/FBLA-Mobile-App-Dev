import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Spoken name, e.g. "Alex's shares". */
  label: string;
}

/**
 * A small − value + control for whole numbers. Screen readers get one adjustable
 * element (swipe up or down to change it) instead of two separate buttons.
 */
export function Stepper({ value, onChange, min = 0, max = 99, label }: StepperProps) {
  const { colors, radii, layout, motion, spacing } = useTheme();
  const change = (delta: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  };

  const button = (delta: 1 | -1) => {
    const disabled = delta === -1 ? value <= min : value >= max;
    return (
      <Pressable
        // The whole control is one adjustable element for screen readers; the buttons are for touch.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        disabled={disabled}
        onPress={() => change(delta)}
        hitSlop={2}
        style={({ pressed }) => [
          styles.button,
          { width: layout.minTarget, height: layout.minTarget },
          disabled && styles.disabled,
          pressed && { opacity: motion.pressedOpacity },
        ]}
      >
        <Icon name={delta === -1 ? 'remove' : 'add'} size={20} color="accent" fixedSize />
      </Pressable>
    );
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => change(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={[styles.row, { borderRadius: radii.pill, borderColor: colors.fieldBorder }]}
    >
      {button(-1)}
      <AppText variant="headline" tabular align="center" style={{ minWidth: spacing.lg }}>
        {value}
      </AppText>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  button: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
});
