import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface SheetProps {
  children: ReactNode;
  /** Title drawn inside the sheet, for sheets without a navigation header (the trip switcher). */
  title?: string;
  /** Pinned under the scrolling content, above the home indicator: the sheet's main actions. */
  footer?: ReactNode;
  /** Short line under the title. */
  subtitle?: string;
}

/**
 * Layout for a screen presented as a native sheet or modal. Presentation itself stays native
 * (`formSheet` / `modal` in RootNavigator), which already provides the grabber, detents,
 * swipe to dismiss, and screen reader support; this only arranges what's inside.
 */
export function Sheet({ children, title, subtitle, footer }: SheetProps) {
  const { colors, spacing, layout, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const background = scheme === 'dark' ? colors.surfaceRaised : colors.background;
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: title ? spacing.lg + spacing.xxs : spacing.md,
          paddingBottom: footer ? spacing.md : spacing.lg + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.md }]}>
          {title ? (
            <View style={{ gap: spacing.xxs }}>
              <AppText variant="title2" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="subhead" color="labelSecondary">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          ) : subtitle ? (
            <AppText variant="callout" color="labelSecondary">
              {subtitle}
            </AppText>
          ) : null}
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View
          style={{
            padding: spacing.md,
            paddingBottom: spacing.md + insets.bottom,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.separator,
            backgroundColor: background,
          }}
        >
          <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.sm }]}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', alignSelf: 'center' },
});
