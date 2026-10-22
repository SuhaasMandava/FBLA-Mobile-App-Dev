import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { parseJoinLink } from '../utils/inviteLink';

export interface InviteLinkContextValue {
  /** The code from a join link (triphub://join/CODE) that hasn't been acted on yet. */
  pendingCode: string | null;
  /** Call once the Join screen has been opened with the code. */
  clearPendingCode: () => void;
}

export const InviteLinkContext = createContext<InviteLinkContextValue | undefined>(undefined);

/**
 * Remembers the code from a join link, whether the link launched the app or arrived while
 * it was open. It's held until someone is signed in, so a link opened before signing in
 * (or signing up) still lands on the Join screen afterwards.
 */
export function InviteLinkProvider({ children }: { children: ReactNode }) {
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const take = (url: string | null) => {
      const code = parseJoinLink(url);
      if (active && code) setPendingCode(code);
    };
    Linking.getInitialURL()
      .then(take)
      .catch(() => {}); // no launch link is the normal case
    const subscription = Linking.addEventListener('url', ({ url }) => take(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const clearPendingCode = useCallback(() => setPendingCode(null), []);
  const value = useMemo(() => ({ pendingCode, clearPendingCode }), [pendingCode, clearPendingCode]);
  return <InviteLinkContext.Provider value={value}>{children}</InviteLinkContext.Provider>;
}
