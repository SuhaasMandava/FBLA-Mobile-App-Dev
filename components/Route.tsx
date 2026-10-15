import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { ColorTokens } from '../theme/theme';

/**
 * The Route: TripHub's signature graphic (docs/design-system.md, section 5).
 * A dotted line in the accent color with round stops. Every piece here is decorative and hidden
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

/** One stop on the Route. `current` (today) is larger and ringed. `onHero` draws it for the navy hero card. */
export function RouteStop({
  state = 'future',
  size = 12,
  onHero = false,
}: {
  state?: StopState;
  size?: number;
  onHero?: boolean;
}) {
  const { colors } = useTheme();
  const current = state === 'current';
  const outer = current ? size + 6 : size;
  const accent = onHero ? colors.heroAccent : colors.accent;
  const idle = onHero ? colors.onHeroSecondary : colors.fieldBorder;
  const fill = onHero ? colors.hero : colors.surface;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        borderWidth: 2,
        borderColor: state === 'future' ? idle : accent,
        backgroundColor: state === 'past' ? accent : fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {current ? (
        <View style={{ width: size - 4, height: size - 4, borderRadius: size, backgroundColor: accent }} />
      ) : null}
    </View>
  );
}

/**
 * The app mark, drawn from the icon: a navy disc holding a white map pin with an amber
 * center, a tilted orbit ring, and two blue dots on it (the group traveling together),
 * with a short dotted route leading to the pin's point. Used on Welcome, the loading
 * screen, and empty states. `size` is the disc's diameter.
 */
export function AppMark({ size = 56 }: { size?: number }) {
  const { colors } = useTheme();
  const head = size * 0.42; // pin head width
  const pinLeft = size * 0.5 - head / 2;
  const pinTop = size * 0.2;
  const headCenter = { x: size * 0.5, y: pinTop + head / 2 };
  const sun = head * 0.32;
  const planet = head * 0.2;
  const orbitW = size * 0.66;
  const orbitH = size * 0.3;
  const routeDot = Math.max(2, size * 0.035);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.markDisc },
      ]}
    >
      {/* A square with one sharp corner, turned 45° so the corner points down: the pin. */}
      <View
        style={[
          styles.pin,
          {
            left: pinLeft,
            top: pinTop,
            width: head,
            height: head,
            borderRadius: head / 2,
            borderBottomRightRadius: head * 0.08,
            backgroundColor: colors.markPin,
          },
        ]}
      />
      <View
        style={[
          styles.orbit,
          {
            left: headCenter.x - orbitW / 2,
            top: headCenter.y - orbitH / 2,
            width: orbitW,
            height: orbitH,
            borderRadius: orbitH / 2,
            borderColor: colors.markPin,
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          left: headCenter.x - sun / 2,
          top: headCenter.y - sun / 2,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          backgroundColor: colors.markSun,
        }}
      />
      {[
        { x: headCenter.x - head * 0.36, y: headCenter.y - head * 0.3 },
        { x: headCenter.x + head * 0.3, y: headCenter.y + head * 0.24 },
      ].map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: p.x - planet / 2,
            top: p.y - planet / 2,
            width: planet,
            height: planet,
            borderRadius: planet / 2,
            backgroundColor: colors.markPlanet,
          }}
        />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <View
          key={`route-${i}`}
          style={{
            position: 'absolute',
            left: size * (0.24 + i * 0.065),
            top: size * (0.78 - i * 0.025),
            width: routeDot,
            height: routeDot,
            borderRadius: routeDot / 2,
            backgroundColor: colors.markPin,
            opacity: 0.8,
          }}
        />
      ))}
    </View>
  );
}

const MAX_STOPS = 10;

/**
 * Trip progress for the Home hero: one stop per day (sampled down to ten for long trips),
 * past days filled, today ringed. Fills in from left to right when the trip changes,
 * unless Reduce Motion is on.
 */
export function RouteProgress({
  dayCount,
  todayIndex,
  onHero = false,
}: {
  dayCount: number;
  todayIndex: number | null;
  /** Draw for the navy hero card. */
  onHero?: boolean;
}) {
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
              <RouteStop state={state} onHero={onHero} />
            </Animated.View>
            {i < count - 1 ? (
              <View
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      state === 'past'
                        ? onHero
                          ? colors.heroAccent
                          : colors.accent
                        : onHero
                          ? colors.onHeroSecondary
                          : colors.separator,
                    opacity: state !== 'past' && onHero ? 0.4 : 1,
                  },
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
  disc: {
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pin: { position: 'absolute', transform: [{ rotate: '45deg' }] },
  orbit: { position: 'absolute', borderWidth: 1, opacity: 0.6, transform: [{ rotate: '-22deg' }] },
  progress: { flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  progressCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progressLast: { flex: 0 },
  segment: { flex: 1, height: 2, marginHorizontal: 2, borderRadius: 1 },
});
