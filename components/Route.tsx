import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { ColorTokens } from '../theme/theme';

/**
 * The Route: TripHub's signature graphic (docs/design-system.md, section 5).
 * A dotted teal line with round stops. Every piece here is decorative and hidden
 * from screen readers; the text next to it carries the meaning.
 */

const DOT = 3;
const DOT_GAP = 4;

/** A dotted line that fills its container along one axis. */
export function DottedLine({
  direction = 'vertical',
  color = 'accent',
  faded = false,
}: {
  direction?: 'vertical' | 'horizontal';
  color?: keyof ColorTokens;
  faded?: boolean;
}) {
  const { colors } = useTheme();
  const vertical = direction === 'vertical';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.lineClip, vertical ? styles.lineVertical : styles.lineHorizontal, faded && styles.faded]}
    >
      {Array.from({ length: 80 }, (_, i) => (
        <View
          key={i}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: colors[color],
            [vertical ? 'marginBottom' : 'marginRight']: DOT_GAP,
          }}
        />
      ))}
    </View>
  );
}

type StopState = 'past' | 'current' | 'future';

/** One stop on the Route. `current` (today) is larger and ringed. */
export function RouteStop({ state = 'future', size = 12 }: { state?: StopState; size?: number }) {
  const { colors } = useTheme();
  const current = state === 'current';
  const outer = current ? size + 6 : size;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        borderWidth: 2,
        borderColor: state === 'future' ? colors.fieldBorder : colors.accent,
        backgroundColor: state === 'past' ? colors.accent : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {current ? (
        <View style={{ width: size - 4, height: size - 4, borderRadius: size, backgroundColor: colors.accent }} />
      ) : null}
    </View>
  );
}

/** Three overlapping dots on a short route: the group arriving together. Used in empty states and Welcome. */
export function CrewMark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  const fills = [colors.accent, colors.motifMint, colors.motifSun];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.crewRow}
    >
      <View style={{ width: size * 2.2, height: DOT }}>
        <DottedLine direction="horizontal" />
      </View>
      <View style={[styles.crewDots, { marginLeft: size * 0.2 }]}>
        {fills.map((fill, i) => (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: fill,
              marginLeft: i === 0 ? 0 : -size * 0.35,
              borderWidth: 2,
              borderColor: colors.background,
              opacity: 0.95,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const MAX_STOPS = 10;

/**
 * Trip progress for the Home hero: one stop per day (sampled down to ten for long trips),
 * past days filled, today ringed. Fills in from left to right when the trip changes,
 * unless Reduce Motion is on.
 */
export function RouteProgress({ dayCount, todayIndex }: { dayCount: number; todayIndex: number | null }) {
  const { colors, motion } = useTheme();
  const reducedMotion = useReducedMotion();
  const count = Math.max(1, Math.min(dayCount, MAX_STOPS));
  // Map today's day onto the sampled stops; before the trip it's -1, after it's past the end.
  const current =
    todayIndex === null
      ? null
      : dayCount <= MAX_STOPS
        ? todayIndex
        : Math.round((todayIndex / Math.max(1, dayCount - 1)) * (count - 1));

  const [reveal] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  useEffect(() => {
    if (reducedMotion) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, { toValue: 1, duration: motion.route, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reveal, reducedMotion, dayCount, todayIndex, motion.route]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.progress}>
      {Array.from({ length: count }, (_, i) => {
        const state: StopState =
          current === null ? 'future' : i < current ? 'past' : i === current ? 'current' : 'future';
        const start = i / count;
        const opacity = reveal.interpolate({
          inputRange: [start, Math.min(1, start + 1 / count)],
          outputRange: [0.25, 1],
          extrapolate: 'clamp',
        });
        return (
          <View key={i} style={[styles.progressCell, i === count - 1 && styles.progressLast]}>
            <Animated.View style={{ opacity }}>
              <RouteStop state={state} />
            </Animated.View>
            {i < count - 1 ? (
              <View
                style={[
                  styles.segment,
                  { backgroundColor: state === 'past' ? colors.accent : colors.separator },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lineClip: { overflow: 'hidden', alignItems: 'center' },
  lineVertical: { flex: 1, width: DOT },
  lineHorizontal: { flex: 1, flexDirection: 'row', height: DOT },
  faded: { opacity: 0.45 },
  crewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  crewDots: { flexDirection: 'row' },
  progress: { flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  progressCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progressLast: { flex: 0 },
  segment: { flex: 1, height: 2, marginHorizontal: 2, borderRadius: 1 },
});
