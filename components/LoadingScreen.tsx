import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppMark } from './Route';

/** Startup screen while the saved session is restored. Matches the splash so there's no flash. */
export function LoadingScreen() {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, gap: spacing.lg }]}>
      <AppMark size={88} />
      <ActivityIndicator accessibilityLabel="Loading TripHub" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
