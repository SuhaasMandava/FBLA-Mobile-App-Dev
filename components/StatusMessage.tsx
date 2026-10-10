import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface StatusMessageProps {
  /** Show a spinner above the title. */
  loading?: boolean;
  title: string;
  body?: string;
  /** Buttons to show under the message, e.g. Retry or Create Trip. */
  children?: ReactNode;
}

/** Centered loading / error / empty state shared by the trip screens. */
export function StatusMessage({ loading = false, title, body, children }: StatusMessageProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator accessibilityLabel={title} color={colors.primary} size="large" /> : null}
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole={loading ? undefined : 'header'}>
        {title}
      </Text>
      {body ? <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
});
