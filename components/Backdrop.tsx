import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * A soft wash of the brand color at the top of a full-screen page (welcome, sign-in), fading into the
 * normal background by mid-screen so text below sits on the usual, contrast-checked color. Decorative.
 */
export function Backdrop() {
  const { colors, scheme } = useTheme();
  const top = scheme === 'dark' ? colors.hero : colors.accentTint;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[top, colors.background, colors.background]}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}
