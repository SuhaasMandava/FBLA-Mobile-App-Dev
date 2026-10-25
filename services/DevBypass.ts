// DEV BYPASS: whole file. Delete it, plus the DEV BYPASS blocks in screens/OnboardingScreen.tsx, to remove the bypass.
//
// Signs in as a fixed test account through the REAL Supabase auth flow (so the session, row-level
// security, trips, profile, etc. all behave normally), creating the account the first time.
// Only ever loaded from behind `__DEV__` checks, so Metro strips it from release bundles.
import { supabase } from './supabase';

// DEV BYPASS: throwaway test account. Never use real credentials here.
const DEV_USER = {
  displayName: 'Tester',
  email: 'tester@example.com',
  password: 'devbypass123',
};

export async function devBypassSignIn(): Promise<void> {
  if (!__DEV__) throw new Error('DEV BYPASS is only available in development builds.');
  const { email, password, displayName } = DEV_USER;

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signedIn.error) return;

  // Anything other than "no such account" won't be fixed by signing up; show the real reason.
  if (signedIn.error.code !== 'invalid_credentials') {
    throw new Error(`sign-in failed (${signedIn.error.code ?? signedIn.error.message})`);
  }

  // First run: create the account. A session comes back only when "Confirm email" is off in Supabase.
  const created = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (created.error) {
    throw new Error(`sign-up failed (${created.error.code ?? created.error.message}). ${SETUP_HINT}`);
  }
  if (!created.data.session) {
    throw new Error(`account created but not signed in (email confirmation is on). ${SETUP_HINT}`);
  }
}

const SETUP_HINT =
  `Fix: in the Supabase dashboard add the user ${DEV_USER.email} (Authentication → Users → Add user, tick "Auto Confirm User"), then tap again.`;
