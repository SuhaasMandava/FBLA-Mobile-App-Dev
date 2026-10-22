import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ControlledTextField } from '../components/ControlledTextField';
import { InlineBanner } from '../components/InlineBanner';
import { AppMark } from '../components/Route';
import { SegmentedControl } from '../components/SegmentedControl';
import { useInviteLink } from '../hooks/useInviteLink';
import { useSignInForm } from '../hooks/useSignInForm';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { useTheme } from '../hooks/useTheme';
import { passwordMatch, PASSWORDS_DONT_MATCH, PASSWORDS_MATCH } from '../models/AuthForm';

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
  const [password, confirmPassword] = useWatch({ control: form.control, name: ['password', 'confirmPassword'] });
  const match = passwordMatch(password, confirmPassword);
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
        liveError={match === 'mismatch' ? PASSWORDS_DONT_MATCH : null}
        success={match === 'match' ? PASSWORDS_MATCH : null}
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

/** Shown when a join link opened the app before anyone signed in: the link is kept for afterwards. */
function InviteNotice() {
  const { pendingCode } = useInviteLink();
  const { spacing } = useTheme();
  if (!pendingCode) return null;
  return (
    <Card accessible accessibilityLabel={`You're invited to a trip. After you sign in, TripHub opens the invite with code ${pendingCode.split('').join(' ')}.`}>
      <View style={{ gap: spacing.xxs }}>
        <AppText variant="headline">{"You're invited to a trip"}</AppText>
        <AppText variant="subhead" color="labelSecondary">
          {`Create an account or sign in, and TripHub will open the invite (code ${pendingCode}) so you can join.`}
        </AppText>
      </View>
    </Card>
  );
}

// DEV BYPASS: signs in as a fixed test account (see services/DevBypass.ts). Remove with that file.
function DevBypassButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- DEV BYPASS: lazy so release bundles drop the module
      const { devBypassSignIn } = require('../services/DevBypass') as typeof import('../services/DevBypass');
      await devBypassSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dev sign-in failed.');
      setBusy(false);
    }
  };
  return (
    <>
      {error ? <InlineBanner tone="error" message={`DEV BYPASS: ${error}`} /> : null}
      <Button label="DEV: Skip login (test user)" onPress={run} loading={busy} />
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
                <AppMark size={72} />
              </View>
              <AppText variant="largeTitle" accessibilityRole="header">
                TripHub
              </AppText>
              <AppText variant="callout" color="labelSecondary">
                Plan the trip together, from first idea to last stop.
              </AppText>
            </View>

            <InviteNotice />

            <SegmentedControl
              options={[
                { value: 'signUp', label: 'Create Account' },
                { value: 'signIn', label: 'Sign In' },
              ]}
              value={mode}
              onChange={setMode}
            />

            {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}

            {/* DEV BYPASS: development builds only; `__DEV__` is false in release so this and the require are stripped. */}
            {__DEV__ ? <DevBypassButton /> : null}
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
