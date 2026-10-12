import { Ref, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface FormFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  label: string;
  /** Inline validation message shown under the input. */
  error?: string | null;
  /** Extra spoken guidance, e.g. the expected format. */
  hint?: string;
  inputRef?: Ref<TextInput>;
}

export function FormField({ label, error, hint, inputRef, secureTextEntry, ...inputProps }: FormFieldProps) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const isSecret = secureTextEntry === true;

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
      <View>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecret && !revealed}
          style={[
            styles.input,
            isSecret && styles.inputWithToggle,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : colors.border,
            },
          ]}
          {...inputProps}
        />
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={4}
            style={styles.toggle}
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>{revealed ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
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
  inputWithToggle: { paddingRight: 72 },
  toggle: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 13 },
});
