import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * The line under a field: the error, else a success message (each with an icon, so it
 * isn't color alone), else the helper text.
 */
export function FieldMessage({ error, success, helper }: { error?: string | null; success?: string | null; helper?: string }) {
  const { spacing } = useTheme();
  if (success && !error) {
    return (
      <View accessibilityLiveRegion="polite" style={[styles.row, { gap: spacing.xxs + 2 }]}>
        <Icon name="checkmark-circle" size={16} color="success" />
        <AppText variant="footnote" color="success" style={styles.text}>
          {success}
        </AppText>
      </View>
    );
  }
  if (error) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.row, { gap: spacing.xxs + 2 }]}
      >
        <Icon name="alert-circle" size={16} color="danger" />
        <AppText variant="footnote" color="danger" style={styles.text}>
          {error}
        </AppText>
      </View>
    );
  }
  if (!helper) return null;
  return (
    // The field already speaks its helper as a hint, so this copy is for sighted people only.
    <AppText
      variant="footnote"
      color="labelSecondary"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {helper}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1 },
});
