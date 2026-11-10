import { Children, Fragment, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { shadowStyle } from '../theme/theme';
import { AppText } from './AppText';
import { SectionHeader } from './SectionHeader';

interface ListSectionProps {
  children: ReactNode;
  header?: string;
  headerAction?: { label: string; onPress: () => void; hint?: string };
  /** Short explanation under the group, e.g. what a setting does. */
  footer?: string;
}

/** A grouped list: rounded container, inset separators between rows. */
export function ListSection({ children, header, headerAction, footer }: ListSectionProps) {
  const { colors, radii, spacing, scheme } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.xs }}>
      {header ? <SectionHeader title={header} action={headerAction} /> : null}
      {/* The outer view carries the shadow; the inner one clips rows to the rounded corners. */}
      <View style={[{ borderRadius: radii.lg, backgroundColor: colors.surface }, shadowStyle(colors, scheme, 'card')]}>
      <View
        style={[
          styles.group,
          {
            borderRadius: radii.lg,
            borderColor: colors.separator,
            borderWidth: scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.separator,
                  marginLeft: spacing.md,
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      </View>
      {footer ? (
        <AppText variant="footnote" color="labelSecondary" style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
});
