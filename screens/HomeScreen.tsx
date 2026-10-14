import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { AvatarStack, Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { HeaderButton } from '../components/HeaderButton';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { OfflineBanner } from '../components/OfflineBanner';
import { RouteProgress } from '../components/Route';
import { Screen } from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { useItinerary } from '../hooks/useItinerary';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ItineraryModel } from '../models/ItineraryModel';
import { Trip, TripModel } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { ShareService } from '../services/ShareService';
import { formatClockTime, formatDateRange, formatDayHeading, todayISO } from '../utils/dates';
import { formatCents } from '../utils/money';
import { tripProgress } from '../utils/tripProgress';
import { TabScreenNavigation } from './types';

const UPCOMING_COUNT = 3;
/** Trip names longer than this may not fit in the large title. */
const LONG_NAME = 22;

function TripHero({ trip }: { trip: Trip }) {
  const { spacing } = useTheme();
  const largeText = useLargeText();
  const progress = tripProgress(trip.startDate, trip.endDate, todayISO());
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const people = trip.members.length === 1 ? '1 person' : `${trip.members.length} people`;
  return (
    <Card
      variant="hero"
      accessible
      accessibilityLabel={`${trip.name}. ${trip.destination}, ${dates}. ${progress.label}. ${people}.`}
    >
      <View style={{ gap: spacing.xxs }}>
        {/* An iOS large title is one line; a long trip name gets cut off there, so show it in full here. */}
        {trip.name.length > LONG_NAME ? <AppText variant="title3">{trip.name}</AppText> : null}
        <View style={[styles.inline, { gap: spacing.xs }]}>
          <Icon name="location-outline" size={18} color="accent" />
          <AppText variant="headline" style={styles.shrink}>
            {trip.destination}
          </AppText>
        </View>
        <AppText variant="subhead" color="labelSecondary" tabular>
          {dates}
        </AppText>
      </View>
      <RouteProgress key={trip.id} dayCount={progress.dayCount} todayIndex={progress.todayIndex} />
      <View style={[styles.heroFooter, largeText && styles.stacked, { gap: spacing.xs }]}>
        <AppText variant="subheadStrong" color="labelSecondary" tabular>
          {progress.label}
        </AppText>
        <View style={[styles.inline, { gap: spacing.xs }]}>
          <AvatarStack names={trip.members.map((m) => m.displayName)} />
          <AppText variant="subhead" color="labelSecondary">
            {people}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function InviteSection({ trip, onShare, sharing }: { trip: Trip; onShare: () => void; sharing: boolean }) {
  const { spacing } = useTheme();
  if (!trip.inviteCode) return null;
  const alone = trip.members.length === 1;
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title3" accessibilityRole="header" style={{ paddingHorizontal: spacing.xxs }}>
        Invite Friends
      </AppText>
      <Card>
        <View
          accessible
          accessibilityLabel={`Invite code: ${trip.inviteCode.split('').join(' ')}`}
          style={{ gap: spacing.xxs, alignItems: 'center' }}
        >
          <AppText variant="code" selectable align="center">
            {trip.inviteCode}
          </AppText>
          <AppText variant="subhead" color="labelSecondary" align="center">
            {alone
              ? "You're the only one here so far. Send this code so friends can join."
              : 'Anyone with this code can join the trip.'}
          </AppText>
        </View>
        <Button
          label="Share Invite Code"
          icon="share-outline"
          variant={alone ? 'filled' : 'tinted'}
          hint="Opens the share sheet to send the code to friends."
          onPress={onShare}
          loading={sharing}
        />
      </Card>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip, trips, loading, error, refresh } = useTrip();
  const { items } = useItinerary();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // The trip's name is the large title; "Trips" opens the switcher.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: activeTrip?.name ?? 'Home',
      headerRight:
        trips.length > 0
          ? () => (
              <HeaderButton
                label="Trips"
                icon="swap-horizontal"
                accessibilityLabel="Switch trip"
                onPress={() => navigation.navigate('TripSwitcher')}
              />
            )
          : undefined,
    });
  }, [navigation, activeTrip?.name, trips.length]);

  if (loading && trips.length === 0) {
    return (
      <Screen>
        <SkeletonList label="Loading your trips" />
      </Screen>
    );
  }

  if (trips.length === 0) {
    if (error) {
      return (
        <EmptyState tone="error" title="Couldn't load your trips" body={error}>
          <Button label="Try Again" onPress={refresh} />
        </EmptyState>
      );
    }
    return (
      <EmptyState title="No trips yet" body="Start a trip and invite your group, or join one with a code from a friend.">
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
        <Button label="Join with Code" variant="tinted" onPress={() => navigation.navigate('JoinTrip')} />
      </EmptyState>
    );
  }

  if (!activeTrip) return null; // setTrips always selects one when trips exist

  const upcoming = ItineraryModel.upcoming(items, todayISO(), UPCOMING_COUNT);
  const alone = activeTrip.members.length === 1;

  const share = async () => {
    setSharing(true);
    setShareError(null);
    try {
      await ShareService.shareInvite(activeTrip);
    } catch (e) {
      setShareError(getErrorMessage(e));
    } finally {
      setSharing(false);
    }
  };

  const invite = <InviteSection trip={activeTrip} onShare={share} sharing={sharing} />;

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
      {shareError ? <InlineBanner tone="error" message={`Couldn't share the code. ${shareError}`} /> : null}

      <TripHero trip={activeTrip} />

      {/* Getting people in comes first while you're the only member. */}
      {alone ? invite : null}

      {upcoming.length === 0 ? (
        <ListSection header="Coming Up">
          <EmptyState inline title="Nothing planned yet" body="Add the first stop and everyone will see it.">
            <Button label="Plan the Itinerary" variant="tinted" onPress={() => navigation.navigate('Itinerary')} />
          </EmptyState>
        </ListSection>
      ) : (
        <ListSection
          header="Coming Up"
          headerAction={{
            label: 'See All',
            hint: 'Opens the full itinerary',
            onPress: () => navigation.navigate('Itinerary'),
          }}
        >
          {upcoming.map((item) => (
            <ListRow
              key={item.id}
              overline={`${formatDayHeading(item.day)}${item.time ? ` · ${formatClockTime(item.time)}` : ''}`}
              title={item.title}
              subtitle={item.location ?? undefined}
              trailing="chevron"
              accessibilityHint="Opens the itinerary"
              onPress={() => navigation.navigate('Itinerary')}
            />
          ))}
        </ListSection>
      )}

      {alone ? null : invite}

      <ListSection header="Budget">
        <ListRow
          leading={<Icon name="wallet-outline" size={22} color="accent" />}
          title="Trip budget"
          value={activeTrip.budgetCents > 0 ? formatCents(activeTrip.budgetCents) : 'Not set'}
        />
      </ListSection>

      <ListSection header={`Crew · ${activeTrip.members.length}`}>
        {activeTrip.members.map((member) => (
          <ListRow
            key={member.userId}
            leading={<Avatar name={member.displayName} />}
            title={TripModel.memberName(member)}
            trailing={member.role === 'organizer' ? <Badge label="Organizer" /> : undefined}
            accessibilityLabel={`${TripModel.memberName(member)}${member.role === 'organizer' ? ', organizer' : ''}`}
          />
        ))}
      </ListSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
});
