import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ColorTokens, shadowStyle } from '../theme/theme';
import { pressFeedback } from '../utils/haptics';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'filled' | 'tinted' | 'plain' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `filled`: the screen's primary action. `tinted`: secondary actions.
   * `plain`: text only, inline. `destructive`: red text, for delete and sign out.
   */
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Extra spoken guidance describing what the button does. */
  hint?: string;
  /** Shrink to fit the label instead of filling the row. */
  compact?: boolean;
}

const foreground: Record<ButtonVariant, keyof ColorTokens> = {
  filled: 'onAccent',
  tinted: 'onAccentTint',
  plain: 'accent',
  destructive: 'danger',
};

export function Button({
  label,
  onPress,
  variant = 'filled',
  icon,
  loading = false,
  disabled = false,
  hint,
  compact = false,
}: ButtonProps) {
  const { colors, layout, radii, spacing, motion, scheme } = useTheme();
  const inactive = disabled || loading;
  const fg = foreground[variant];
  const bezeled = variant === 'filled' || variant === 'tinted';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (variant === 'filled') pressFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: bezeled ? layout.controlHeight : layout.minTarget,
          minWidth: layout.minTarget,
          borderRadius: radii.pill,
          paddingHorizontal: bezeled ? spacing.lg : spacing.xs,
          paddingVertical: bezeled ? spacing.sm : 0,
        },
        compact && styles.compact,
        variant === 'filled' && { backgroundColor: pressed ? colors.accentPressed : colors.accent },
        // The one primary action on a screen lifts off the page; it settles when pressed.
        variant === 'filled' && !inactive && scheme === 'light' && { ...shadowStyle(colors, scheme, 'card'), shadowColor: colors.accent, shadowOpacity: 0.28 },
        bezeled && pressed && { transform: [{ scale: 0.98 }] },
        variant === 'tinted' && { backgroundColor: colors.accentTint },
        !bezeled && pressed && { opacity: motion.pressedOpacity },
        variant === 'tinted' && pressed && { opacity: 0.85 },
        inactive && { opacity: 0.5 },
      ]}
    >
      {/* The label stays laid out while loading, so the button keeps its size. */}
      <View style={[styles.content, { gap: spacing.xs }, loading && styles.hidden]}>
        {icon ? <Icon name={icon} size={20} color={fg} /> : null}
        <AppText variant="headline" color={fg} align="center" style={styles.label}>
          {label}
        </AppText>
      </View>
      {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors[fg]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  compact: { alignSelf: 'auto' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1 },
  hidden: { opacity: 0 },
});
