import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlledFormField } from '../components/ControlledFormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { useSignInForm } from '../hooks/useSignInForm';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { useTheme } from '../hooks/useTheme';

type Mode = 'signIn' | 'signUp';

function SignInForm() {
  const { colors } = useTheme();
  const form = useSignInForm();
  return (
    <>
      <ControlledFormField
        control={form.control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <ControlledFormField
        control={form.control}
        name="password"
        label="Password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />
      {form.submitError ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {form.submitError}
        </Text>
      ) : null}
      <PrimaryButton label="Sign In" onPress={form.submit} loading={form.submitting} />
    </>
  );
}

function SignUpForm() {
  const { colors } = useTheme();
  const form = useSignUpForm();
  return (
    <>
      <ControlledFormField
        control={form.control}
        name="displayName"
        label="Your name"
        hint="Shown to the people on your trips."
        placeholder="e.g. Alex Rivera"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <ControlledFormField
        control={form.control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <ControlledFormField
        control={form.control}
        name="password"
        label="Password"
        hint="At least 8 characters, with a letter and a number."
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />
      {form.submitError ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {form.submitError}
        </Text>
      ) : null}
      <PrimaryButton label="Create Account" onPress={form.submit} loading={form.submitting} />
    </>
  );
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Welcome
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Plan group trips together.</Text>

        <SegmentedControl
          options={[
            { value: 'signIn', label: 'Sign In' },
            { value: 'signUp', label: 'Create Account' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: -8 },
});
