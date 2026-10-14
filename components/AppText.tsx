import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ColorTokens, tabularNumbers, TypeRole } from '../theme/theme';

interface AppTextProps extends Omit<TextProps, 'style'> {
  /** Type role from the design tokens. Defaults to body. */
  variant?: TypeRole;
  /** Color token. Defaults to the primary label color. */
  color?: keyof ColorTokens;
  /** Line digits up (times, dates, money). */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

/** Text in a token type style. Scales with the system text size like any RN Text. */
export function AppText({ variant = 'body', color = 'label', tabular = false, align, style, ...rest }: AppTextProps) {
  const { colors, type } = useTheme();
  return (
    <Text
      style={[type[variant], { color: colors[color] }, tabular && tabularNumbers, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
