import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { AppMark } from './Route';

interface EmptyStateProps {
  title: string;
  body?: string;
  /** Buttons that answer "what now?", e.g. Create Trip. At most two. */
  children?: ReactNode;
  /** `error` swaps the crew motif for an alert icon. */
  tone?: 'empty' | 'error';
  /** Fill the screen and center (default), or sit inline inside a list. */
  inline?: boolean;
}

/** What a screen shows when it has nothing yet, or couldn't load. Always says what to do next. */
export function EmptyState({ title, body, children, tone = 'empty', inline = false }: EmptyStateProps) {
  const { colors, spacing, layout } = useTheme();
  return (
    // Paints its own background: it can also show before the navigator (which normally supplies one) exists.
    <View
      style={[
        inline ? styles.inline : styles.full,
        { backgroundColor: inline ? undefined : colors.background, padding: spacing.lg, gap: spacing.sm },
      ]}
    >
      <View style={[styles.inner, { maxWidth: layout.maxContentWidth, gap: spacing.sm }]}>
        <View style={{ marginBottom: spacing.xs }}>
          {tone === 'error' ? <Icon name="alert-circle" size={44} color="danger" /> : <AppMark />}
        </View>
        <AppText variant="title2" align="center" accessibilityRole="header">
          {title}
        </AppText>
        {body ? (
          <AppText variant="callout" color="labelSecondary" align="center">
            {body}
          </AppText>
        ) : null}
        {children ? <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.sm }]}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inline: { alignItems: 'center', paddingVertical: 32 },
  inner: { width: '100%', alignItems: 'center' },
  actions: { alignSelf: 'stretch' },
});
