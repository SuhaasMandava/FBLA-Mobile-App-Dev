import { ReactNode } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface CardProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  /** `hero` is the larger midnight-navy card at the top of Home; put `onHero` colors inside it. */
  variant?: 'plain' | 'hero';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'plain', style, ...rest }: CardProps) {
  const { colors, radii, spacing, scheme } = useTheme();
  const hero = variant === 'hero';
  return (
    <View
      style={[
        {
          backgroundColor: hero ? colors.hero : colors.surface,
          borderRadius: hero ? radii.xl : radii.lg,
          padding: hero ? spacing.lg - spacing.xxs : spacing.md,
          gap: spacing.sm,
        },
        // Light mode only: in dark mode the navy already stands off the background.
        hero &&
          scheme === 'light' && {
            shadowColor: colors.label,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
