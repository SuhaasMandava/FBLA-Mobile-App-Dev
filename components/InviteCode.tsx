import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

/** The invite code as six tiles, easy to read aloud and copy by eye. Spoken as spaced letters. */
export function InviteCode({ code }: { code: string }) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Invite code: ${code.split('').join(' ')}`}
      style={[styles.row, { gap: spacing.xs }]}
    >
      {code.split('').map((char, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            { backgroundColor: colors.background, borderRadius: radii.md, borderColor: colors.separator },
          ]}
        >
          <AppText variant="title1" color="accent" maxFontSizeMultiplier={1.3}>
            {char}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  cell: { flex: 1, maxWidth: 52, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
