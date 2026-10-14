import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';
import { createTheme, Theme } from '../theme/theme';

export type ThemeContextValue = Theme;

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

/**
 * Follows the system appearance. There's deliberately no in-app light/dark switch
 * (HIG, Dark Mode › Best practices): people set it once, for every app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const increasedContrast = useIncreasedContrast();
  const scheme = systemScheme === 'dark' ? 'dark' : 'light';
  const value = useMemo(() => createTheme(scheme, increasedContrast), [scheme, increasedContrast]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
