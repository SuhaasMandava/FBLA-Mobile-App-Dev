import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNetwork } from '../hooks/useNetwork';
import { useTheme } from '../hooks/useTheme';

/** A slim notice shown only while the device has no connection. Uses inverted theme colors so it reads in light and dark. */
export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { online } = useNetwork();
  const { colors } = useTheme();
  if (online) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.text }, style]}
    >
      <Text style={[styles.text, { color: colors.background }]}>{"You're offline. Showing your saved data."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  text: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
