import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthService } from '../services/AuthService';
import { getErrorMessage } from '../services/errors';

export type AuthStatus = 'loading' | 'ready' | 'error';

export interface AuthContextValue {
  /** The signed-in user's id; null until sign-in finishes (or if it failed). */
  userId: string | null;
  status: AuthStatus;
  error: string | null;
  /** Try signing in again after a failure. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    AuthService.getOrCreateUserId()
      .then((id) => {
        if (cancelled) return;
        setUserId(id);
        setError(null);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ userId, status, error, retry }),
    [userId, status, error, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
