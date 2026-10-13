import { AuthChangeEvent, AuthError } from '@supabase/supabase-js';
import { SignInValues, SignUpValues } from '../models/AuthForm';
import { CacheService } from './CacheService';
import { UserFacingError } from './errors';
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string | null;
}

function toUser(user: { id: string; email?: string } | null | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/** The request never reached the server (as opposed to the server saying no). */
function isNetworkAuthError(error: AuthError): boolean {
  return error.name === 'AuthRetryableFetchError';
}

/** Turn a Supabase auth failure into a message people can act on. */
function toUserFacing(error: AuthError): UserFacingError {
  switch (error.code) {
    case 'invalid_credentials':
      return new UserFacingError('Incorrect email or password.');
    case 'email_not_confirmed':
      // Only accounts created while "Confirm email" was still on can hit this.
      return new UserFacingError("This account was never confirmed and can't sign in. Create a new account instead.");
    case 'user_already_exists':
    case 'email_exists':
      return new UserFacingError('An account with this email already exists. Try signing in instead.');
    case 'weak_password':
      return new UserFacingError('That password is too weak. Use at least 8 characters with a letter and a number.');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new UserFacingError('Too many attempts. Wait a minute and try again.');
    case 'signup_disabled':
      return new UserFacingError('New sign-ups are turned off right now.');
  }
  if (error.name === 'AuthRetryableFetchError') {
    return new UserFacingError("Couldn't reach the server. Check your connection and try again.");
  }
  console.error('Unexpected auth error', error);
  return new UserFacingError('Something went wrong. Please try again.');
}

export const AuthService = {
  /**
   * Who is signed in on this device, or null if nobody. Works with no connection:
   * an access token that has expired can't be refreshed offline and Supabase then
   * reports "no session", but the saved login is still good once the network is
   * back. A network failure therefore keeps the last signed-in user instead of
   * bouncing them to the sign-in screen with their saved data out of reach.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.getSession();
    const user = toUser(data.session?.user);
    if (user) {
      void CacheService.writeLastUser(user);
      return user;
    }
    if (error) {
      if (isNetworkAuthError(error)) return CacheService.readLastUser();
      throw toUserFacing(error);
    }
    return null;
  },

  /** Be told whenever the user signs in, signs out, or their session changes. Returns an unsubscribe function. */
  onAuthChange(listener: (event: AuthChangeEvent, user: AuthUser | null) => void): () => void {
    // Keep this callback synchronous: Supabase can deadlock if it awaits other auth calls in here.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = toUser(session?.user);
      if (user) void CacheService.writeLastUser(user);
      else if (event === 'SIGNED_OUT') void CacheService.clearLastUser();
      listener(event, user);
    });
    return () => data.subscription.unsubscribe();
  },

  /**
   * Create the account and sign straight in. Email confirmation is not used:
   * "Confirm email" must be off in the Supabase dashboard (Authentication →
   * Sign In / Providers → Email), otherwise Supabase returns no session here.
   */
  async signUp({ displayName, email, password }: SignUpValues): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // The signup trigger copies this into the new profile row.
      options: { data: { display_name: displayName } },
    });
    if (error) throw toUserFacing(error);

    // If confirmation is still switched on, an address that already has an account "succeeds"
    // with a placeholder user that has no identities (Supabase hides which emails exist).
    if (data.user && data.user.identities?.length === 0) {
      throw new UserFacingError('An account with this email already exists. Try signing in instead.');
    }
    if (!data.session) {
      console.error('Sign-up returned no session: turn off "Confirm email" in the Supabase dashboard.');
      throw new UserFacingError("Your account was created but couldn't be signed in. Try signing in.");
    }
  },

  async signIn({ email, password }: SignInValues): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw toUserFacing(error);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    // With no connection the server can't be told, but the session on this device is still removed, so that counts.
    if (error && !isNetworkAuthError(error)) throw toUserFacing(error);
    await CacheService.clearLastUser();
  },
};
