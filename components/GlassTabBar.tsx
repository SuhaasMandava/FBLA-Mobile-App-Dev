import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createContext, ReactNode, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
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

/**
 * The tab bar as a floating capsule of glass: content scrolls underneath it. The selected tab is
 * marked three ways (filled icon, tinted capsule, heavier label), so color is never the only signal.
 */
export function GlassTabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: TabIcons }) {
  const { colors, layout, radii } = useTheme();
  const insets = useSafeAreaInsets();
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
      <Glass radius={radii.pill} style={[styles.bar, { height: layout.tabBarHeight, maxWidth: 520 }]}>
        <View accessibilityRole="tablist" style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const pair = icons[route.name];
            const tint = focused ? colors.accent : colors.labelSecondary;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                tapFeedback();
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                accessibilityState={{ selected: focused }}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.item,
                    { borderRadius: radii.pill },
                    focused && { backgroundColor: colors.accentTint },
                  ]}
                >
                  {pair ? <Icon name={pair[focused ? 0 : 1]} tint={tint} size={22} fixedSize /> : null}
                  {/* The bar's height is fixed, so labels grow only so far with the text size. */}
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                    style={[styles.label, { color: focused ? colors.onAccentTint : colors.labelSecondary }, focused && styles.labelFocused]}
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
  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'stretch', justifyContent: 'center', minHeight: 44 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  item: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, marginHorizontal: 1 },
  label: { fontSize: 10.5, lineHeight: 13, fontWeight: '500' },
  labelFocused: { fontWeight: '700' },
});
