import { UserFacingError } from './errors';
import { supabase } from './supabase';

let pending: Promise<string> | null = null;

async function resolveUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    console.error('Anonymous sign-in failed', error);
    throw new UserFacingError("Couldn't sign you in. Check your connection and try again.");
  }
  return anon.user.id;
}

export const AuthService = {
  /**
   * The current user's id, signing in anonymously if there's no saved session.
   * Stand-in until real accounts exist: the session persists on the device, so
   * the same install keeps the same identity. Requires "Anonymous sign-ins" to
   * be enabled in the Supabase dashboard (Authentication → Sign In / Providers).
   */
  getOrCreateUserId(): Promise<string> {
    // Share one in-flight request so concurrent callers can't create two anonymous users.
    pending ??= resolveUserId().finally(() => {
      pending = null;
    });
    return pending;
  },
};
