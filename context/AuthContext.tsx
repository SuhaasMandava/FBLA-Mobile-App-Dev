import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthService, AuthUser } from '../services/AuthService';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  /** 'loading' only while the session saved on the device is being read at startup. */
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  signOut: () => Promise<void>;
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

    // The listener is the source of truth (it also reports the saved session at startup);
    // the direct read is a fallback so startup never hangs on "loading".
    const unsubscribe = AuthService.onAuthChange(settle);
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

  const signOut = useCallback(() => AuthService.signOut(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: !loaded ? 'loading' : user ? 'signedIn' : 'signedOut',
      userId: user?.id ?? null,
      email: user?.email ?? null,
      signOut,
    }),
    [loaded, user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
