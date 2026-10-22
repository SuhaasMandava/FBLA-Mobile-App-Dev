import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

export interface IntroContextValue {
  /** Has this phone seen the first-run intro? Null while that's being read at startup. */
  seen: boolean | null;
  markSeen: () => void;
}

export const IntroContext = createContext<IntroContextValue | undefined>(undefined);

const SEEN_KEY = 'triphub.introSeen';

/** Remembers, per device, whether the first-run intro has been shown. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((value) => setSeen(value === 'yes'))
      .catch(() => setSeen(false)); // can't tell: showing the short intro again is harmless
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(SEEN_KEY, 'yes').catch(() => {});
  }, []);

  const value = useMemo(() => ({ seen, markSeen }), [seen, markSeen]);
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}
