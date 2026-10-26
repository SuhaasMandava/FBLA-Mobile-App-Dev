import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthService, AuthUser } from '../services/AuthService';
import { CacheService } from '../services/CacheService';
import { NotificationService } from '../services/NotificationService';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  /** 'loading' only while the session saved on the device is being read at startup. */
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  signOut: () => Promise<void>;
  /** Permanently delete the account and everything saved on this device. */
  deleteAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const settle = (next: AuthUser | null) => {
      if (!active) return;
      loadedRef.current = true;
      setUser(next);
      setLoaded(true);
    };

    // Later changes (sign-in, sign-out, token refresh) come from the listener. Its
    // INITIAL_SESSION report is skipped: with an expired token and no connection it says
    // "nobody", whereas getCurrentUser() knows that was a network failure, not a sign-out.
    const unsubscribe = AuthService.onAuthChange((event, next) => {
      if (event !== 'INITIAL_SESSION') settle(next);
    });
    AuthService.getCurrentUser()
      .then((saved) => {
        if (!loadedRef.current) settle(saved);
      })
      .catch(() => {
        if (!loadedRef.current) settle(null);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const userId = user?.id ?? null;
  const signOut = useCallback(async () => {
    await AuthService.signOut();
    if (userId) await CacheService.clearUser(userId); // don't leave their saved trips on the device
    await NotificationService.cancelAllActivityReminders(); // nor reminders about them
  }, [userId]);

  const deleteAccount = useCallback(async () => {
    await AuthService.deleteAccount();
    if (userId) await CacheService.clearUser(userId);
    await NotificationService.cancelAllActivityReminders();
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: !loaded ? 'loading' : user ? 'signedIn' : 'signedOut',
      userId,
      email: user?.email ?? null,
      signOut,
      deleteAccount,
    }),
    [loaded, user, userId, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
