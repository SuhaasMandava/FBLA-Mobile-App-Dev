import { StyleProp, ViewStyle } from 'react-native';
import { useNetwork } from '../hooks/useNetwork';
import { InlineBanner } from './InlineBanner';

/** Shown only while the device has no connection. */
export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { online } = useNetwork();
  if (online) return null;
  return <InlineBanner tone="offline" message="You're offline. Showing what's saved on this phone." style={style} />;
}
