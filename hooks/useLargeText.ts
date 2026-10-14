import { useWindowDimensions } from 'react-native';
import { layout } from '../theme/theme';

/** True at accessibility text sizes, where side-by-side content should stack vertically. */
export function useLargeText(): boolean {
  const { fontScale } = useWindowDimensions();
  return fontScale >= layout.largeTextScale;
}
