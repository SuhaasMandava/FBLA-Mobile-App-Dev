import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { shadowStyle } from '../theme/theme';

interface CardProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  /** `form` is a roomier, more raised card that holds a whole form (sign-in). `hero` is the larger midnight-navy card at the top of Home; put `onHero` colors inside it. */
  variant?: 'plain' | 'hero' | 'form';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'plain', style, ...rest }: CardProps) {
  const { colors, radii, spacing, scheme } = useTheme();
  const hero = variant === 'hero';
  const form = variant === 'form';
  return (
    <View
      style={[
        {
          backgroundColor: hero ? colors.hero : colors.surface,
          borderRadius: hero || form ? radii.xl : radii.lg,
          padding: hero ? spacing.lg - spacing.xxs : form ? spacing.md + spacing.xxs : spacing.md,
          gap: form ? spacing.md : spacing.sm,
        },
        // Light mode lifts cards with a soft shadow; dark mode marks the edge with a hairline instead.
        shadowStyle(colors, scheme, hero || form ? 'raised' : 'card'),
        scheme === 'dark' && !hero && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
