import { useEffect, useState } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';

/** A gray placeholder block. */
function Bone({ width, height }: { width: DimensionValue; height: number }) {
  const { colors, radii } = useTheme();
  return <View style={{ width, height, borderRadius: radii.sm, backgroundColor: colors.skeleton }} />;
}

/**
 * Placeholder rows shaped like a list, shown on first load instead of a blank screen.
 * Gently pulses; holds still when Reduce Motion is on. Read as a single "Loading" element.
 */
export function SkeletonList({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  const { colors, radii, spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ opacity: pulse, gap: spacing.lg }}
    >
      <View style={{ gap: spacing.xs }}>
        <Bone width="60%" height={28} />
        <Bone width="40%" height={16} />
      </View>
      <View style={[styles.group, { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.lg }]}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ gap: spacing.xs }}>
            <Bone width="30%" height={12} />
            <Bone width={i % 2 ? '55%' : '75%'} height={16} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
});
