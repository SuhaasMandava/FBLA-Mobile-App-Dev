import { Ref } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface FormFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  label: string;
  /** Inline validation message shown under the input. */
  error?: string | null;
  /** Extra spoken guidance, e.g. the expected format. */
  hint?: string;
  inputRef?: Ref<TextInput>;
}

export function FormField({ label, error, hint, inputRef, ...inputProps }: FormFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {/* The input carries its own accessibilityLabel, so hide the visible label to avoid it being read twice. */}
      <Text
        style={[styles.label, { color: colors.textMuted }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
        {...inputProps}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.danger }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 13 },
});
