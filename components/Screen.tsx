import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * The scrolling body of a tab screen. `contentInsetAdjustmentBehavior` lets the iOS large
 * title collapse as you scroll; content stops widening at a readable width on tablets.
 */
export function Screen({ children, refreshing, onRefresh }: ScreenProps) {
  const { colors, spacing, layout } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        ) : undefined
      }
    >
      <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.lg }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', alignSelf: 'center' },
});
