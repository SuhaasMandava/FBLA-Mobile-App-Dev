import { Children, Fragment, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
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
  const { colors, radii, spacing } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.xs }}>
      {header ? <SectionHeader title={header} action={headerAction} /> : null}
      <View
        style={[
          styles.group,
          { backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.separator },
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
      {footer ? (
        <AppText variant="footnote" color="labelSecondary" style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
