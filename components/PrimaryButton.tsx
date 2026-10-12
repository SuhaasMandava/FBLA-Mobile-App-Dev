import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** `primary` is filled; `secondary` is outlined; `danger` is outlined in red for destructive actions. */
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  /** Extra spoken guidance describing what the button does. */
  hint?: string;
}

export function PrimaryButton({ label, onPress, variant = 'primary', loading = false, disabled = false, hint }: PrimaryButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const filled = variant === 'primary';
  const accent = variant === 'danger' ? colors.danger : colors.primary;
  const textColor = filled ? colors.onPrimary : accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        filled ? { backgroundColor: colors.primary } : { borderColor: accent, borderWidth: 1.5 },
        { opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '600' },
});
