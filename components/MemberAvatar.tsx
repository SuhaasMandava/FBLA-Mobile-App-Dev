import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { initialsOf } from '../utils/names';

/** A circle with the person's initials. Decorative: the name is always shown or announced next to it. */
export function MemberAvatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent },
      ]}
    >
      <Text style={[styles.initials, { color: colors.onAccent, fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});
