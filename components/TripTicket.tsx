import { StyleSheet, View } from 'react-native';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { Trip } from '../models/TripModel';
import { formatDateRange, todayISO } from '../utils/dates';
import { tripCountdown, tripProgress } from '../utils/tripProgress';
import { AppText } from './AppText';
import { Avatar, AvatarStack } from './Avatar';
import { Icon } from './Icon';
import { DottedLine, RouteProgress } from './Route';

/** Trip names longer than this may not fit in the large title. */
const LONG_NAME = 22;
const NOTCH = 24;

/**
 * The Trip Hub's hero: a boarding pass. The destination and dates on top, the Route showing how far
 * into the trip you are, a perforation, and a stub with the countdown and the crew. Everything on it
 * is one spoken sentence; the graphics are decorative.
 */
export function TripTicket({ trip }: { trip: Trip }) {
  const { colors, spacing, radii, scheme } = useTheme();
  const largeText = useLargeText();
  const today = todayISO();
  const progress = tripProgress(trip.startDate, trip.endDate, today);
  const countdown = tripCountdown(trip.startDate, trip.endDate, today);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const people = trip.members.length === 1 ? '1 person' : `${trip.members.length} people`;
  const overline = trip.name.length > LONG_NAME ? trip.name : `${progress.dayCount}-day trip`;

  return (
    <View
      accessible
      accessibilityLabel={`${trip.name}. ${trip.destination}, ${dates}. ${progress.label}. ${people}.`}
      style={[
        styles.ticket,
        { backgroundColor: colors.hero, borderRadius: radii.xl },
        scheme === 'light' && {
          shadowColor: colors.hero,
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
      ]}
    >
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs }}>
        <AppText variant="caption" color="onHeroSecondary" style={styles.overline} numberOfLines={2}>
          {overline.toUpperCase()}
        </AppText>
        <AppText variant="display" color="onHero">
          {trip.destination}
        </AppText>
        <View style={[styles.inline, { gap: spacing.xs }]}>
          <Icon name="calendar-outline" size={16} color="heroAccent" />
          <AppText variant="subheadStrong" color="onHeroSecondary" tabular>
            {dates}
          </AppText>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <RouteProgress key={trip.id} onHero dayCount={progress.dayCount} todayIndex={progress.todayIndex} />
        </View>
      </View>

      {/* The perforation: two bites out of the edges and a dotted line between them. */}
      <View style={styles.perforation} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
        <View style={[styles.perforationLine, { marginHorizontal: NOTCH }]}>
          <DottedLine direction="horizontal" color="heroLine" />
        </View>
        <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />
      </View>

      <View
        style={[
          styles.stub,
          largeText && styles.stubStacked,
          { backgroundColor: colors.heroPanel, padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
        ]}
      >
        <View style={{ flexShrink: 1 }}>
          <AppText variant="display" color="onHero" tabular style={styles.figure} numberOfLines={1}>
            {countdown.figure}
          </AppText>
          <AppText variant="subheadStrong" color="onHeroSecondary">
            {countdown.caption}
          </AppText>
        </View>
        <View style={[styles.crew, largeText && styles.crewStacked, { gap: spacing.xs }]}>
          {trip.members.length === 1 ? (
            <Avatar name={trip.members[0].displayName} size={36} />
          ) : (
            <AvatarStack onHero names={trip.members.map((m) => m.displayName)} size={36} />
          )}
          <AppText variant="subheadStrong" color="onHeroSecondary">
            {people}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { overflow: 'hidden' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  overline: { letterSpacing: 1.4 },
  perforation: { height: NOTCH, justifyContent: 'center' },
  perforationLine: { height: 3 },
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, top: 0 },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  stub: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' },
  stubStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  figure: { fontSize: 44, lineHeight: 48 },
  crew: { alignItems: 'flex-end' },
  crewStacked: { alignItems: 'flex-start' },
});
