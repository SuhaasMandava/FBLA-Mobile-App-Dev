import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  formatClockTime,
  formatDate,
  parseClockTime,
  parseDateInput,
  parseISODate,
  parseTimeInput,
  toClockTime,
  toISODate,
  todayISO,
} from '../utils/dates';
import { AppText } from './AppText';
import { Button } from './Button';
import { FieldMessage } from './FieldMessage';
import { Icon } from './Icon';

interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  /** YYYY-MM-DD for dates, 24-hour HH:MM for times; empty when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  /** Visible guidance under the field (also spoken). */
  helper?: string;
  placeholder?: string;
  /** Earliest and latest selectable day (YYYY-MM-DD). Dates only. */
  minDate?: string;
  maxDate?: string;
  /** Day the picker opens on when nothing is chosen yet. Dates only. */
  initialDate?: string;
  /** Offer a Clear button once a value is set, for optional fields. */
  clearable?: boolean;
}

/**
 * A field you can type into or pick from. Typing is forgiving ("9/21/26", "sept 21", "tomorrow", "930pm")
 * and is tidied into the standard format when you leave the field. The calendar or clock button opens the
 * platform picker: a native dialog on Android, an inline picker under the field on iOS.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  error,
  helper,
  placeholder,
  minDate,
  maxDate,
  initialDate,
  clearable = false,
}: DateTimeFieldProps) {
  const { colors, type, scheme, spacing, radii, layout, motion } = useTheme();
  const [open, setOpen] = useState(false); // iOS: is the inline picker showing
  const [text, setText] = useState<string | null>(null); // what's being typed; null when not typing
  const [typedError, setTypedError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const isDate = mode === 'date';

  const startingDay = initialDate ?? minDate ?? todayISO();
  const pickerValue = value
    ? isDate
      ? parseISODate(value)
      : parseClockTime(value)
    : isDate
      ? parseISODate(startingDay)
      : parseClockTime('09:00');
  const minimumDate = isDate && minDate ? parseISODate(minDate) : undefined;
  const maximumDate = isDate && maxDate ? parseISODate(maxDate) : undefined;

  const display = value ? (isDate ? formatDate(value) : formatClockTime(value)) : null;
  const commit = (date: Date) => {
    setText(null);
    setTypedError(null);
    onChange(isDate ? toISODate(date) : toClockTime(date));
  };

  /** What a typed entry means, or why it can't be used. Empty text clears the field. */
  const interpret = (raw: string): { value: string } | { problem: string } => {
    if (!raw.trim()) return { value: '' };
    if (!isDate) {
      const time = parseTimeInput(raw);
      return time ? { value: time } : { problem: "Couldn't read that time. Try 9:30 AM or 14:30." };
    }
    const date = parseDateInput(raw);
    if (!date) return { problem: "Couldn't read that date. Try 09/21/2026, Sep 21, or tomorrow." };
    if (minDate && date < minDate) return { problem: `Choose ${formatDate(minDate)} or later.` };
    if (maxDate && date > maxDate) return { problem: `Choose ${formatDate(maxDate)} or earlier.` };
    return { value: date };
  };

  // Each keystroke keeps the form's value in step with the text, so submitting while still typing
  // can't send a stale date. A problem is only shown once the person leaves the field.
  const onChangeText = (raw: string) => {
    setText(raw);
    setTypedError(null);
    const result = interpret(raw);
    onChange('value' in result ? result.value : '');
  };

  const finishTyping = () => {
    if (text === null) return;
    if (text === (display ?? '')) {
      setText(null); // focused and left without editing
      return;
    }
    const result = interpret(text);
    if ('value' in result) {
      onChange(result.value);
      setText(null); // back to the tidy formatted date
    } else {
      setTypedError(result.problem);
    }
  };

  const openPicker = () => {
    finishTyping();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode,
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => commit(date),
      });
      return;
    }
    // iOS: choosing the day that's already highlighted doesn't fire a change, so record what the picker shows.
    if (!open && !value) commit(pickerValue);
    setOpen((o) => !o);
  };

  const shownError = typedError ?? error;
  const spokenHint = shownError
    ? `Error: ${shownError}`
    : (helper ?? `Type ${isDate ? 'a date' : 'a time'}, or use the button to open the picker`);

  return (
    <View style={{ gap: spacing.xs - 2 }}>
      <AppText
        variant="subheadStrong"
        color="labelSecondary"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </AppText>
      <View style={[styles.row, { gap: spacing.xs }]}>
        <View
          style={[
            styles.input,
            {
              minHeight: layout.controlHeight,
              borderRadius: radii.md,
              paddingLeft: spacing.xs,
              paddingRight: spacing.md,
              backgroundColor: colors.surface,
              borderColor: shownError ? colors.danger : focused ? colors.accent : colors.fieldBorder,
              borderWidth: shownError || focused ? 2 : 1,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${isDate ? 'date' : 'time'} picker for ${label}`}
            accessibilityState={{ expanded: Platform.OS === 'ios' ? open : undefined }}
            onPress={openPicker}
            hitSlop={4}
            style={({ pressed }) => [
              styles.pickerButton,
              { minWidth: layout.minTarget, minHeight: layout.minTarget },
              pressed && { opacity: motion.pressedOpacity },
            ]}
          >
            <Icon name={isDate ? 'calendar-outline' : 'time-outline'} size={20} color="labelSecondary" />
          </Pressable>
          {/* The label is spoken with the current value, e.g. "Start date, Sep 21, 2026". */}
          <TextInput
            accessibilityLabel={`${label}${display ? `, ${display}` : ', not set'}`}
            accessibilityHint={spokenHint}
            value={text ?? display ?? ''}
            placeholder={placeholder ?? (isDate ? 'Type or pick a date' : 'Type or pick a time')}
            placeholderTextColor={colors.labelSecondary}
            onFocus={() => {
              setFocused(true);
              setText(display ?? '');
            }}
            onChangeText={onChangeText}
            onBlur={() => {
              setFocused(false);
              finishTyping();
            }}
            onSubmitEditing={finishTyping}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            selectTextOnFocus
            style={[type.body, styles.text, { color: colors.label }, webNoOutline]}
          />
        </View>
        {clearable && value ? (
          <Button
            variant="plain"
            compact
            label="Clear"
            hint={`Clears ${label}`}
            onPress={() => {
              setOpen(false);
              setText(null);
              setTypedError(null);
              onChange('');
            }}
          />
        ) : null}
      </View>

      {Platform.OS === 'ios' && open ? (
        <View style={{ gap: spacing.xs }}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display={isDate ? 'inline' : 'spinner'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={scheme}
            accentColor={colors.accent}
            onValueChange={(_event, date) => commit(date)}
          />
          <Button label="Done" variant="tinted" onPress={() => setOpen(false)} />
        </View>
      ) : null}

      <FieldMessage error={shownError} helper={helper} />
    </View>
  );
}

// The box draws the focus ring; keep the browser's own ring off the inner text box on web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pickerButton: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, paddingVertical: 0 },
});
