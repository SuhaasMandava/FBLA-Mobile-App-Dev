import { Pressable, StyleSheet, View } from 'react-native';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Two-or-more way switch, announced to screen readers as tabs. Selection is shown by a raised
 * thumb and a heavier label, not by color alone. Segments stack at large text sizes.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors, radii, spacing, layout, scheme } = useTheme();
  const largeText = useLargeText();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.track,
        largeText && styles.stacked,
        {
          backgroundColor: scheme === 'dark' ? colors.surface : colors.separator,
          borderRadius: radii.md,
          padding: 3,
          gap: 3,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              !largeText && styles.segmentInRow,
              {
                minHeight: layout.minTarget,
                borderRadius: radii.md - 3,
                paddingHorizontal: spacing.xs,
              },
              selected && {
                backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.surface,
                shadowColor: colors.label,
                shadowOpacity: 0.12,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              },
            ]}
          >
            <AppText variant={selected ? 'subheadStrong' : 'subhead'} color="label" align="center">
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  stacked: { flexDirection: 'column' },
  segment: { alignItems: 'center', justifyContent: 'center' },
  segmentInRow: { flexGrow: 1, flexBasis: 0 },
});
