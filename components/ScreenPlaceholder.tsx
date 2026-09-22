import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/** Temporary body for scaffolded screens. */
export function ScreenPlaceholder({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
});
