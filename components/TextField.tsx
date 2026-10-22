import { Ref, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { FieldMessage } from './FieldMessage';
import { Icon } from './Icon';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  label: string;
  /** Inline validation message. Replaces the helper text while it's shown. */
  error?: string | null;
  /** Positive confirmation (e.g. "Passwords match."), shown in green with a checkmark. An error wins over it. */
  success?: string | null;
  /** Visible guidance under the field (also spoken), e.g. the expected format. */
  helper?: string;
  inputRef?: Ref<TextInput>;
  /** For secure fields: offer a Show/Hide button. Off where the text must stay hidden (choosing a new password). */
  revealable?: boolean;
  /** Larger, spaced monospace text, for the invite code. */
  variant?: 'default' | 'code';
  /** For multiline fields: start one line tall and grow with the text, instead of a 100 pt box. */
  growing?: boolean;
}

export function TextField({
  label,
  error,
  success,
  helper,
  inputRef,
  secureTextEntry,
  revealable = true,
  variant = 'default',
  multiline,
  growing = false,
  ...inputProps
}: TextFieldProps) {
  const { colors, type, spacing, radii, layout } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const isSecret = secureTextEntry === true;
  const showToggle = isSecret && revealable;
  // Screen readers hear the error again whenever they return to the field, not only when it first appears.
  const spokenHint = error ? `Error: ${error}` : (success ?? helper);
  const borderColor = error ? colors.danger : success ? colors.success : colors.fieldBorder;

  return (
    <View style={{ gap: spacing.xs - 2 }}>
      {/* The input carries its own accessibilityLabel, so the visible label is hidden to avoid reading it twice. */}
      <AppText
        variant="subheadStrong"
        color="labelSecondary"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </AppText>
      <View
        style={[
          styles.box,
          {
            minHeight: multiline && !growing ? 100 : layout.controlHeight,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: error || success ? 2 : 1,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={spokenHint}
          placeholderTextColor={colors.labelSecondary}
          secureTextEntry={isSecret && !revealed}
          clearButtonMode={isSecret || multiline ? 'never' : 'while-editing'}
          multiline={multiline}
          textAlignVertical={multiline && !growing ? 'top' : 'center'}
          style={[
            variant === 'code' ? type.code : type.body,
            styles.input,
            {
              color: colors.label,
              paddingHorizontal: spacing.md,
              paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
            },
            variant === 'code' && styles.codeInput,
          ]}
          {...inputProps}
        />
        {showToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((r) => !r)}
            style={[styles.toggle, { minWidth: layout.minTarget, minHeight: layout.minTarget }]}
          >
            <Icon name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color="accent" />
          </Pressable>
        ) : null}
      </View>
      <FieldMessage error={error} success={success} helper={helper} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'stretch' },
  input: { flex: 1 },
  codeInput: { textAlign: 'center' },
  toggle: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
