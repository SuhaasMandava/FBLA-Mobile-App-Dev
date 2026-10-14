import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

/** A small tinted capsule such as "Organizer" or "Today". Always words, never color alone. */
export function Badge({ label }: { label: string }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.accentTint,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <AppText variant="caption" color="onAccentTint">
        {label}
      </AppText>
    </View>
  );
}
