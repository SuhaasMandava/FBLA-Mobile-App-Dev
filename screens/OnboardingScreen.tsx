import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ControlledTextField } from '../components/ControlledTextField';
import { InlineBanner } from '../components/InlineBanner';
import { CrewMark } from '../components/Route';
import { SegmentedControl } from '../components/SegmentedControl';
import { useSignInForm } from '../hooks/useSignInForm';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { useTheme } from '../hooks/useTheme';

type Mode = 'signUp' | 'signIn';

function SignInForm() {
  const form = useSignInForm();
  return (
    <>
      <ControlledTextField
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
      <ControlledTextField
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
      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
      <Button label="Sign In" onPress={form.submit} loading={form.submitting} />
    </>
  );
}

function SignUpForm() {
  const form = useSignUpForm();
  return (
    <>
      <ControlledTextField
        control={form.control}
        name="displayName"
        label="Your name"
        helper="Shown to the people on your trips."
        placeholder="e.g. Alex Rivera"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <ControlledTextField
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
      {/* Both password boxes stay hidden (no Show button); the second one catches typos. */}
      <ControlledTextField
        control={form.control}
        name="password"
        label="Password"
        helper="At least 8 characters, with a letter and a number."
        secureTextEntry
        revealable={false}
        deps={['confirmPassword']}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <ControlledTextField
        control={form.control}
        name="confirmPassword"
        label="Confirm password"
        helper="Type the same password again."
        secureTextEntry
        revealable={false}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />
      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
      <Button label="Create Account" onPress={form.submit} loading={form.submitting} />
    </>
  );
}

export default function OnboardingScreen() {
  const { colors, spacing, layout } = useTheme();
  const insets = useSafeAreaInsets();
  // New people are the common case on first launch; signing in is one tap away.
  const [mode, setMode] = useState<Mode>('signUp');

  return (
    // This screen has no header, so the safe-area padding sits outside the scroll view: the strip behind the
    // clock and battery stays solid and the form scrolls away underneath it instead of overlapping them.
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.lg + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.md }]}>
            <View style={[styles.hero, { gap: spacing.xs, marginBottom: spacing.sm }]}>
              <View style={{ marginBottom: spacing.sm }}>
                <CrewMark size={44} />
              </View>
              <AppText variant="largeTitle" accessibilityRole="header">
                TripHub
              </AppText>
              <AppText variant="callout" color="labelSecondary">
                Plan the trip together, from first idea to last stop.
              </AppText>
            </View>

            <SegmentedControl
              options={[
                { value: 'signUp', label: 'Create Account' },
                { value: 'signIn', label: 'Sign In' },
              ]}
              value={mode}
              onChange={setMode}
            />

            {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'flex-start' },
});
