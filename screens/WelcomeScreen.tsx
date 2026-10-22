import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { AppMark } from '../components/Route';
import { useIntro } from '../hooks/useIntro';
import { useTheme } from '../hooks/useTheme';
import { RootNavigation } from './types';

interface Step {
  icon: IconName;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'map-outline',
    title: 'Plan the trip together',
    body: "Create a trip and you're its organizer. Everyone on it shares the itinerary, the budget and a checklist, and sees changes as they happen.",
  },
  {
    icon: 'key-outline',
    title: 'Invite with a code',
    body: 'Every trip gets a 6-character invite code. Share it from Home, or send the invite link straight to WhatsApp or a text.',
  },
  {
    icon: 'enter-outline',
    title: 'Friends join in seconds',
    body: 'They tap Join with Code and type it in, or open your link and the code is filled in for them. Only people with the code can join.',
  },
];

/**
 * The short first-run intro: what TripHub is for and how the invite code works, in three
 * steps. Shown once before signing in (Skip or Get Started ends it), and again any time from
 * Settings → How TripHub Works.
 */
export default function WelcomeScreen() {
  const { colors, spacing, layout, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute();
  const { markSeen } = useIntro();
  const [index, setIndex] = useState(0);
  const titleRef = useRef<View>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const replay = route.name === 'Intro'; // opened from Settings, as a sheet

  // Move the screen reader to the new step's title, the way a new page would. (Not available on the web.)
  useEffect(() => {
    if (Platform.OS !== 'web' && titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
  }, [index]);

  const finish = () => (replay ? navigation.goBack() : markSeen());

  return (
    <SafeAreaView edges={replay ? [] : ['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.lg, flexGrow: 1 }}>
        <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.lg }]}>
          <View style={[styles.topRow, { minHeight: layout.minTarget }]}>
            <AppMark size={44} />
            {last ? null : (
              <Button variant="plain" compact label="Skip" hint="Closes the introduction" onPress={finish} />
            )}
          </View>

          <View
            accessible
            accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}
            style={[styles.dots, { gap: spacing.xs }]}
          >
            {STEPS.map((s, i) => (
              <View
                key={s.title}
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: radii.pill,
                  backgroundColor: i === index ? colors.accent : colors.fieldBorder,
                }}
              />
            ))}
          </View>

          <View style={{ gap: spacing.sm }}>
            <View
              style={[styles.badge, { backgroundColor: colors.accentTint, borderRadius: radii.xl, width: 72, height: 72 }]}
            >
              <Icon name={step.icon} size={36} color="onAccentTint" />
            </View>
            <View ref={titleRef} accessible accessibilityRole="header">
              <AppText variant="title1">{step.title}</AppText>
            </View>
            <AppText variant="body" color="labelSecondary">
              {step.body}
            </AppText>
          </View>

          {index >= 1 ? (
            // A sample of what people will see and type, so the code is recognizable later.
            <Card accessible accessibilityLabel="Example invite code: K 7 M 9 P Q">
              <AppText variant="subheadStrong" color="labelSecondary" align="center">
                Invite code
              </AppText>
              <AppText variant="code" align="center">
                K7M9PQ
              </AppText>
              {index === 2 ? (
                <AppText variant="footnote" color="labelSecondary" align="center">
                  Or open triphub://join/K7M9PQ
                </AppText>
              ) : null}
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { padding: spacing.md, paddingBottom: spacing.md + insets.bottom, gap: spacing.sm, borderTopColor: colors.separator },
        ]}
      >
        <View style={[styles.column, { maxWidth: layout.maxContentWidth, gap: spacing.sm }]}>
          <Button
            label={last ? (replay ? 'Done' : 'Get Started') : 'Next'}
            onPress={last ? finish : () => setIndex(index + 1)}
          />
          {index > 0 ? <Button label="Back" variant="plain" onPress={() => setIndex(index - 1)} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  badge: { alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
