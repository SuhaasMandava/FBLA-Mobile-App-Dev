import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { initialsOf } from '../utils/names';
import { AppText } from './AppText';

/** A circle with the person's initials. Decorative: the name is always shown or announced next to it. */
export function Avatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentTint }]}
    >
      {/* Fixed size: the circle doesn't grow with text, so the initials mustn't either. */}
      <AppText
        variant="headline"
        color="onAccentTint"
        allowFontScaling={false}
        style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

/** Up to three overlapping avatars and a "+N" count, for the trip hero. */
export function AvatarStack({
  names,
  size = 32,
  onHero = false,
}: {
  names: (string | null)[];
  size?: number;
  /** Drawn on the navy hero card. */
  onHero?: boolean;
}) {
  const { colors } = useTheme();
  const shown = names.slice(0, 3);
  const extra = names.length - shown.length;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stack}>
      {shown.map((name, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.3,
            borderRadius: size,
            borderWidth: 2,
            borderColor: onHero ? colors.hero : colors.surface,
          }}
        >
          <Avatar name={name} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <AppText variant="subheadStrong" color={onHero ? 'onHeroSecondary' : 'labelSecondary'} style={{ marginLeft: 6 }}>
          +{extra}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
});
