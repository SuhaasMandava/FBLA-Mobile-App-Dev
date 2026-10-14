import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ColorTokens } from '../theme/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  /** Size at the default text size. It grows with the system text size, since Ionicons don't scale on their own. */
  size?: number;
  color?: keyof ColorTokens;
  /** A raw color, for places that hand one in (e.g. the tab bar tint). Overrides `color`. */
  tint?: string;
  /** Spoken label. Without one the icon is decorative and hidden from screen readers. */
  label?: string;
  /** Don't grow with the text size, for bars whose height the system fixes. */
  fixedSize?: boolean;
}

export function Icon({ name, size = 20, color = 'label', tint, label, fixedSize = false }: IconProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scaled = fixedSize ? size : Math.round(size * Math.min(Math.max(fontScale, 1), 2));
  return (
    <Ionicons
      name={name}
      size={scaled}
      color={tint ?? colors[color]}
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}
