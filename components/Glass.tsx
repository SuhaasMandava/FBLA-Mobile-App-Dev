import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useReducedTransparency } from '../hooks/useReducedTransparency';
import { useTheme } from '../hooks/useTheme';
import { shadowStyle } from '../theme/theme';

/** Real Liquid Glass needs iOS 26; some early builds report the design without the API, so check both. */
function detectLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export const liquidGlassAvailable = detectLiquidGlass();

interface GlassProps extends Omit<ViewProps, 'style'> {
  children?: ReactNode;
  /** Corner radius of the glass shape. */
  radius: number;
  /** Stained glass: the accent color for the one primary action in view. */
  tint?: string;
  /** Lets the glass react to touch (iOS 26). For buttons. */
  interactive?: boolean;
  /** Drop the shadow, for glass that sits inside another surface. */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The functional layer: a floating surface for navigation and primary controls, never for content.
 * iOS 26 draws real Liquid Glass. Older iOS and the web blur what is behind. Android, and anyone
 * with Reduce Transparency on, gets a solid surface so text on it always stays readable.
 */
export function Glass({ children, radius, tint, interactive = false, flat = false, style, ...rest }: GlassProps) {
  const { colors, scheme } = useTheme();
  const reducedTransparency = useReducedTransparency();
  const shape: ViewStyle = { borderRadius: radius };
  const shadow = flat ? null : shadowStyle(colors, scheme, 'floating');

  if (liquidGlassAvailable && !reducedTransparency) {
    return (
      <View style={[shape, shadow, style]} {...rest}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme={scheme}
          tintColor={tint}
          isInteractive={interactive}
          style={[StyleSheet.absoluteFill, shape]}
        />
        {children}
      </View>
    );
  }

  const canBlur = Platform.OS !== 'android' && !reducedTransparency;
  const rim = { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder };
  return (
    <View style={[shape, shadow, style]} {...rest}>
      <View style={[StyleSheet.absoluteFill, shape, styles.clip]}>
        {canBlur ? (
          <BlurView
            intensity={60}
            tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            shape,
            rim,
            { backgroundColor: tint ?? (canBlur ? colors.glassFill : colors.glassSolid) },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
