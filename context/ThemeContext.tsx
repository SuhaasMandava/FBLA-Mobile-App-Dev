import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Appearance, Platform, useColorScheme } from 'react-native';
import { createTheme, Theme } from '../theme/theme';

/** 'system' follows the device's appearance; the others override it for this app only. */
export type ThemePreference = 'system' | 'light' | 'dark';

export type ThemeContextValue = Theme & {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const PREFERENCE_KEY = 'triphub.themePreference';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** The system's "more contrast" setting: Increase Contrast on iOS, High contrast text on Android. */
function useIncreasedContrast(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const ios = Platform.OS === 'ios';
    const check = ios ? AccessibilityInfo.isDarkerSystemColorsEnabled : AccessibilityInfo.isHighTextContrastEnabled;
    check()
      .then(setEnabled)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      ios ? 'darkerSystemColorsChanged' : 'highTextContrastChanged',
      setEnabled,
    );
    return () => sub.remove();
  }, []);
  return enabled;
}

/** Follows the system appearance unless the person picked Light or Dark in Settings (saved on the device). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const increasedContrast = useIncreasedContrast();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCE_KEY)
      .then((saved) => {
        if (isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  // Also tell the OS, so native chrome (alerts, pickers, keyboard) matches. Not available everywhere (e.g. web).
  useEffect(() => {
    Appearance.setColorScheme?.(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREFERENCE_KEY, next).catch(() => {});
  }, []);

  const resolved = preference === 'system' ? systemScheme : preference;
  const scheme = resolved === 'dark' ? 'dark' : 'light';
  const value = useMemo(
    () => ({ ...createTheme(scheme, increasedContrast), preference, setPreference }),
    [scheme, increasedContrast, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
