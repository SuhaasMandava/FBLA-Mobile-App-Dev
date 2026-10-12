import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatClockTime, formatDate, parseClockTime, parseISODate, toClockTime, toISODate, todayISO } from '../utils/dates';
import { PrimaryButton } from './PrimaryButton';

interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  /** YYYY-MM-DD for dates, 24-hour HH:MM for times; empty when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
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
 * A field that shows the chosen date or time and opens the platform picker:
 * a native dialog on Android, an inline picker under the field on iOS.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  error,
  hint,
  placeholder,
  minDate,
  maxDate,
  initialDate,
  clearable = false,
}: DateTimeFieldProps) {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(false); // iOS: is the inline picker showing
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
  const commit = (date: Date) => onChange(isDate ? toISODate(date) : toClockTime(date));

  const openPicker = () => {
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

  return (
    <View style={styles.field}>
      <Text
        style={[styles.label, { color: colors.textMuted }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${display ?? 'not set'}`}
          accessibilityHint={hint ?? `Opens the ${isDate ? 'date' : 'time'} picker`}
          onPress={openPicker}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
          ]}
        >
          <Text style={[styles.value, { color: display ? colors.text : colors.textMuted }]}>
            {display ?? placeholder ?? (isDate ? 'Select date' : 'Select time')}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => {
              setOpen(false);
              onChange('');
            }}
            style={styles.clear}
          >
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {Platform.OS === 'ios' && open ? (
        <View style={styles.picker}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display={isDate ? 'inline' : 'spinner'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={scheme}
            accentColor={colors.primary}
            onValueChange={(_event, date) => commit(date)}
          />
          <PrimaryButton label="Done" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      ) : null}

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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  value: { fontSize: 16 },
  clear: { minHeight: 48, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 14, fontWeight: '600' },
  picker: { gap: 8 },
  error: { fontSize: 13 },
});
