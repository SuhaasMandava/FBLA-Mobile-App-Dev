import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** The iOS Reduce Transparency setting, kept up to date. Glass surfaces turn opaque while it is on. */
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(setReduced)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
