import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCreateTripForm } from '../hooks/useCreateTripForm';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from './types';

export default function CreateTripScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const form = useCreateTripForm();

  const destinationRef = useRef<TextInput>(null);
  const startRef = useRef<TextInput>(null);
  const endRef = useRef<TextInput>(null);
  const budgetRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    const trip = await form.submit();
    if (trip) navigation.popToTop();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <FormField
          label="Trip name"
          value={form.values.name}
          onChangeText={(text) => form.setField('name', text)}
          error={form.errors.name}
          placeholder="e.g. Smith Family Reunion"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => destinationRef.current?.focus()}
        />
        <FormField
          label="Destination"
          inputRef={destinationRef}
          value={form.values.destination}
          onChangeText={(text) => form.setField('destination', text)}
          error={form.errors.destination}
          placeholder="Where are you headed?"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => startRef.current?.focus()}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              label="Start date"
              hint="Year, month, then day. Digits only; dashes are added for you."
              inputRef={startRef}
              value={form.values.startDate}
              onChangeText={(text) => form.setField('startDate', text)}
              error={form.errors.startDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => endRef.current?.focus()}
            />
          </View>
          <View style={styles.flex}>
            <FormField
              label="End date"
              hint="Year, month, then day. Digits only; dashes are added for you."
              inputRef={endRef}
              value={form.values.endDate}
              onChangeText={(text) => form.setField('endDate', text)}
              error={form.errors.endDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => budgetRef.current?.focus()}
            />
          </View>
        </View>

        <FormField
          label="Budget (USD)"
          hint="Total trip budget in dollars."
          inputRef={budgetRef}
          value={form.values.budget}
          onChangeText={(text) => form.setField('budget', text)}
          error={form.errors.budget}
          placeholder="e.g. 1500"
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
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
          onPress={onSubmit}
          loading={form.submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  submitError: { fontSize: 14 },
});
