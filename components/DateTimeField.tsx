import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatClockTime, formatDate, parseClockTime, parseISODate, toClockTime, toISODate, todayISO } from '../utils/dates';
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
 * A field that shows the chosen date or time and opens the platform picker:
 * a native dialog on Android, an inline picker under the field on iOS.
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
  const { colors, scheme, spacing, radii, layout, motion } = useTheme();
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

  const spokenHint = error ? `Error: ${error}` : (helper ?? `Opens the ${isDate ? 'date' : 'time'} picker`);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${display ?? 'not set'}`}
          accessibilityHint={spokenHint}
          accessibilityState={{ expanded: Platform.OS === 'ios' ? open : undefined }}
          onPress={openPicker}
          style={({ pressed }) => [
            styles.input,
            {
              minHeight: layout.controlHeight,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              gap: spacing.sm,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : colors.fieldBorder,
              borderWidth: error ? 2 : 1,
            },
            pressed && { opacity: motion.pressedOpacity },
          ]}
        >
          <Icon name={isDate ? 'calendar-outline' : 'time-outline'} size={20} color="labelSecondary" />
          <AppText variant="body" color={display ? 'label' : 'labelSecondary'} tabular style={styles.value}>
            {display ?? placeholder ?? (isDate ? 'Select date' : 'Select time')}
          </AppText>
        </Pressable>
        {clearable && value ? (
          <Button
            variant="plain"
            compact
            label="Clear"
            hint={`Clears ${label}`}
            onPress={() => {
              setOpen(false);
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

      <FieldMessage error={error} helper={helper} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  value: { flex: 1 },
});
