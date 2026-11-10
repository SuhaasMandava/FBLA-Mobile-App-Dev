import { HeaderHeightContext } from '@react-navigation/elements';
import { ReactNode, useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Glass } from './Glass';

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
  const { colors, spacing, layout, radii, scheme } = useTheme();
  // The footer floats over the content as glass, so the content is padded by the footer's measured height.
  const [footerHeight, setFooterHeight] = useState(0);
  const insets = useSafeAreaInsets();
  // The keyboard is measured from the top of the screen, so account for the header above this view.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const background = scheme === 'dark' ? colors.surfaceRaised : colors.background;
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: title ? spacing.lg + spacing.xxs : spacing.md,
          paddingBottom: footer ? footerHeight + spacing.md : spacing.lg + insets.bottom,
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
          pointerEvents="box-none"
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          style={[
            styles.footer,
            { paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <Glass radius={radii.xl} style={[styles.column, { maxWidth: layout.maxContentWidth, padding: spacing.sm }]}>
            <View style={{ gap: spacing.xs }}>{footer}</View>
          </Glass>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  column: { width: '100%', alignSelf: 'center' },
});
