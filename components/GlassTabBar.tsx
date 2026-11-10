import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ComponentRef, createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';
import { shadowStyle } from '../theme/theme';
import { tapFeedback } from '../utils/haptics';
import { Glass } from './Glass';
import { Icon, IconName } from './Icon';

const InsideTabsContext = createContext(false);

/** Wraps the tab navigator so screens inside it know to leave room for the floating bar. */
export function TabBarSpace({ children }: { children: ReactNode }) {
  return <InsideTabsContext.Provider value>{children}</InsideTabsContext.Provider>;
}

/**
 * Bottom padding a scrolling screen needs so its last row clears the floating tab bar.
 * Zero on screens outside the tabs (modals and sheets).
 */
export function useTabBarInset(): number {
  const { layout } = useTheme();
  const insets = useSafeAreaInsets();
  const insideTabs = useContext(InsideTabsContext);
  if (!insideTabs) return 0;
  return layout.tabBarHeight + Math.max(insets.bottom, layout.tabBarMargin) + layout.tabBarMargin;
}

type TabIcons = Record<string, [active: IconName, inactive: IconName]>;

/** Space between the bar's edge and the first/last tab, and around the sliding pill. */
const EDGE = 6;
const PILL_INSET = 5;
/** A finger has to travel this far sideways before a tap becomes a slide. */
const SLIDE_START = 6;

/**
 * The tab bar as a floating capsule of glass: content scrolls underneath it. A pill slides to the
 * selected tab, and you can drag it: press anywhere on the bar and slide sideways, the pill follows
 * your finger (growing a little, like a lens), and letting go opens the tab under it. Tapping works
 * as before, and each tab is still its own button for screen readers and switch control.
 * The selected tab is marked three ways (filled icon, pill, heavier label), never by color alone.
 */
export function GlassTabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: TabIcons }) {
  const { colors, layout, radii, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const count = state.routes.length;

  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth > 0 ? (rowWidth - EDGE * 2) / count : 0;
  /** While sliding: the tab under the finger. Otherwise null. */
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? state.index;

  const [x] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));

  // The gesture handlers are created once, so they read the latest values through a ref.
  const live = useRef({ tabWidth, count, index: state.index, hover, reducedMotion, rowX: 0 });
  const rowRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    live.current = { ...live.current, tabWidth, count, index: state.index, hover, reducedMotion };
  });

  // Glide to the selected tab whenever it changes (tap, slide, or a link from another screen).
  useEffect(() => {
    if (tabWidth === 0 || hover !== null) return;
    const toValue = state.index * tabWidth;
    if (reducedMotion) {
      x.setValue(toValue);
      return;
    }
    const spring = Animated.spring(x, { toValue, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.9 });
    spring.start();
    return () => spring.stop();
  }, [state.index, tabWidth, hover, reducedMotion, x]);

  const select = (index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  });

  const pan = useMemo(() => {
    const setLift = (toValue: number) => {
      if (live.current.reducedMotion) lift.setValue(toValue);
      else Animated.spring(lift, { toValue, useNativeDriver: true, damping: 14, stiffness: 240 }).start();
    };
    const end = (commit: boolean) => {
      const { hover: target, index } = live.current;
      setLift(0);
      setHover(null);
      if (commit && target !== null && target !== index) selectRef.current(target);
    };
    /** Where the pill sits when centered under a finger at this screen x, kept inside the bar. */
    const under = (pageX: number) => {
      const { tabWidth: w, count: n, rowX } = live.current;
      return Math.min(Math.max(pageX - rowX - EDGE - w / 2, 0), (n - 1) * w);
    };
    // The refs are only read inside the gesture callbacks (after render), never while rendering.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      // Taps go to the tab buttons; only a sideways slide is taken over.
      onMoveShouldSetPanResponder: (_, g) =>
        live.current.tabWidth > 0 && Math.abs(g.dx) > SLIDE_START && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => {
        const start = under(e.nativeEvent.pageX);
        x.setValue(start);
        setLift(1);
        const over = Math.round(start / live.current.tabWidth);
        live.current.hover = over;
        setHover(over);
      },
      onPanResponderMove: (e) => {
        const { tabWidth: w, hover: last } = live.current;
        const next = under(e.nativeEvent.pageX);
        x.setValue(next);
        const over = Math.round(next / w);
        if (over !== last) {
          live.current.hover = over;
          tapFeedback();
          setHover(over);
        }
      },
      onPanResponderRelease: () => end(true),
      onPanResponderTerminate: () => end(false),
    });
  }, [x, lift]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingHorizontal: layout.tabBarMargin + 4,
          paddingBottom: Math.max(insets.bottom, layout.tabBarMargin),
        },
      ]}
    >
      <Glass interactive radius={radii.pill} style={[styles.bar, { height: layout.tabBarHeight, maxWidth: 520 }]}>
        <View
          accessibilityRole="tablist"
          style={styles.row}
          ref={rowRef}
          onLayout={(e) => {
            setRowWidth(e.nativeEvent.layout.width);
            rowRef.current?.measureInWindow((left) => {
              live.current.rowX = left;
            });
          }}
          {...pan.panHandlers}
        >
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                {
                  left: EDGE + 1,
                  width: tabWidth - 2,
                  borderRadius: radii.pill,
                  backgroundColor: colors.accentTint,
                  borderColor: colors.glassBorder,
                  transform: [
                    { translateX: x },
                    // While held, the pill swells like a drop of glass under the finger.
                    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                  ],
                },
                hover !== null && shadowStyle(colors, scheme, 'floating'),
              ]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const focused = shown === index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const pair = icons[route.name];
            const tint = focused ? colors.accent : colors.labelSecondary;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                accessibilityState={{ selected: state.index === index }}
                onPress={() => {
                  if (state.index !== index) tapFeedback();
                  select(index);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={({ pressed }) => [styles.tab, pressed && hover === null && styles.pressed]}
              >
                <View style={styles.item}>
                  {pair ? <Icon name={pair[focused ? 0 : 1]} tint={tint} size={22} fixedSize /> : null}
                  {/* The bar's height is fixed, so labels grow only so far with the text size. */}
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.label,
                      { color: focused ? colors.onAccentTint : colors.labelSecondary },
                      focused && styles.labelFocused,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: { width: '100%' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: EDGE },
  pill: { position: 'absolute', top: PILL_INSET, bottom: PILL_INSET, borderWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'stretch', justifyContent: 'center', minHeight: 44 },
  pressed: { opacity: 0.7 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7 },
  label: { fontSize: 10.5, lineHeight: 13, fontWeight: '500' },
  labelFocused: { fontWeight: '700' },
});
