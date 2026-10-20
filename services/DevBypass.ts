// DEV BYPASS: whole file. Delete it, plus the DEV BYPASS blocks in screens/OnboardingScreen.tsx, to remove the bypass.
//
// Signs in as a fixed test account through the REAL Supabase auth flow (so the session, row-level
// security, trips, profile, etc. all behave normally), creating the account the first time.
// Only ever loaded from behind `__DEV__` checks, so Metro strips it from release bundles.
import { AuthService } from './AuthService';

// DEV BYPASS: throwaway test account. Never use real credentials here.
const DEV_USER = {
  displayName: 'Dev Tester',
  email: 'dev.bypass@example.com',
  password: 'devbypass123',
};

export async function devBypassSignIn(): Promise<void> {
  if (!__DEV__) throw new Error('DEV BYPASS is only available in development builds.');
  try {
    await AuthService.signIn({ email: DEV_USER.email, password: DEV_USER.password });
  } catch {
    // First run: the account doesn't exist yet. signUp also signs in ("Confirm email" is off).
    await AuthService.signUp(DEV_USER);
  }
}
