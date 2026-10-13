import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlledDateTimeField } from '../components/ControlledDateTimeField';
import { ControlledFormField } from '../components/ControlledFormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCreateTripForm } from '../hooks/useCreateTripForm';
import { useTheme } from '../hooks/useTheme';
import { todayISO } from '../utils/dates';
import { RootStackParamList } from './types';

export default function CreateTripScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const form = useCreateTripForm(() => navigation.popToTop());
  const startDate = useWatch({ control: form.control, name: 'startDate' });
  const today = todayISO();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <ControlledFormField
          control={form.control}
          name="name"
          label="Trip name"
          hint="Between 3 and 50 characters."
          placeholder="e.g. Smith Family Reunion"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <ControlledFormField
          control={form.control}
          name="destination"
          label="Destination"
          placeholder="Where are you headed?"
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Stacked, not side by side: the iOS calendar opens under its field and needs the full width. */}
        <ControlledDateTimeField
          control={form.control}
          name="startDate"
          mode="date"
          label="Start date"
          minDate={today}
        />
        <ControlledDateTimeField
          control={form.control}
          name="endDate"
          mode="date"
          label="End date"
          minDate={startDate || today}
          initialDate={startDate || today}
        />

        <ControlledFormField
          control={form.control}
          name="budget"
          label="Budget (USD)"
          hint="Total trip budget in dollars."
          placeholder="e.g. 1500"
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={form.submit}
        />

        {form.submitError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.submitError, { color: colors.danger }]}
          >
            {form.submitError}
          </Text>
        ) : null}

        <PrimaryButton
          label="Create Trip"
          hint="Saves the trip and generates an invite code to share."
          onPress={form.submit}
          loading={form.submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  submitError: { fontSize: 14 },
});
