import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** The line under a field: the error (with an icon, so it isn't red alone) or else the helper text. */
export function FieldMessage({ error, helper }: { error?: string | null; helper?: string }) {
  const { spacing } = useTheme();
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
