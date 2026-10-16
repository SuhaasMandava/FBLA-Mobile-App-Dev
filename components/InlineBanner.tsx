import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

interface InlineBannerProps {
  message: string;
  /** `offline` and `warning` are cautions, `error` is a problem. Each carries an icon, so color is never the only signal. */
  tone: 'offline' | 'warning' | 'error';
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/** A notice inside the content, next to what it's about, instead of an alert. Announced when it appears. */
export function InlineBanner({ message, tone, action, style }: InlineBannerProps) {
  const { colors, radii, spacing } = useTheme();
  const color = tone === 'error' ? 'danger' : 'warning';
  const icon = tone === 'error' ? 'alert-circle' : tone === 'warning' ? 'warning-outline' : 'cloud-offline-outline';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: colors[color],
          borderRadius: radii.lg,
          padding: spacing.sm,
          paddingLeft: spacing.md,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Icon name={icon} size={20} color={color} />
        <AppText variant="subhead" style={styles.text}>
          {message}
        </AppText>
      </View>
      {action ? <Button variant="plain" compact label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexGrow: 1, flexBasis: 200 },
  text: { flex: 1 },
});
