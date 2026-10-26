import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
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
import { Reveal } from '../components/Reveal';
import { GlanceTile } from '../components/GlanceTile';
import { InviteCode } from '../components/InviteCode';
import { Screen } from '../components/Screen';
import { TripTicket } from '../components/TripTicket';
import { SkeletonList } from '../components/Skeleton';
import { MessageRow } from '../components/MessageRow';
import { useAuth } from '../hooks/useAuth';
import { useChecklist } from '../hooks/useChecklist';
import { useCommunication } from '../hooks/useCommunication';
import { useExpenses } from '../hooks/useExpenses';
import { useItinerary } from '../hooks/useItinerary';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ChecklistModel } from '../models/ChecklistModel';
import { CommunicationModel } from '../models/CommunicationModel';
import { ItineraryModel } from '../models/ItineraryModel';
import { Trip, TripModel } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { ShareService } from '../services/ShareService';
import { formatClockTime, formatDayHeading, formatRelativeTime, todayISO } from '../utils/dates';
import { formatCents } from '../utils/money';
import { ShareTarget } from '../utils/shareTargets';
import { TabScreenNavigation } from './types';

/** The next stop gets its own tile, so this many more are listed under Coming Up. */
const UPCOMING_COUNT = 3;

/** Which share action is running, so only its button shows a spinner. */
type Sharing = 'sheet' | ShareTarget | null;

interface InviteSectionProps {
  trip: Trip;
  sharing: Sharing;
  onShare: () => void;
  onSend: (target: 'whatsapp' | 'sms') => void;
}

function InviteSection({ trip, sharing, onShare, onSend }: InviteSectionProps) {
  const { spacing, colors } = useTheme();
  if (!trip.inviteCode) return null;
  const alone = trip.members.length === 1;
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title3" accessibilityRole="header" style={{ paddingHorizontal: spacing.xxs }}>
        Invite Friends
      </AppText>
      <Card style={{ borderWidth: 1, borderColor: colors.separator, borderStyle: 'dashed' }}>
        <View style={{ gap: spacing.sm }}>
          <InviteCode code={trip.inviteCode} />
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
          loading={sharing === 'sheet'}
        />
        {/* Straight to the apps groups plan in. Side by side, wrapping under each other at large text sizes. */}
        <View style={[styles.shareRow, { gap: spacing.sm }]}>
          <View style={styles.shareButton}>
            <Button
              label="WhatsApp"
              icon="logo-whatsapp"
              variant="tinted"
              hint="Opens WhatsApp with the invite link and code ready to send."
              onPress={() => onSend('whatsapp')}
              loading={sharing === 'whatsapp'}
            />
          </View>
          <View style={styles.shareButton}>
            <Button
              label="Text"
              icon="chatbubble-ellipses-outline"
              variant="tinted"
              hint="Opens Messages with the invite link and code ready to send."
              onPress={() => onSend('sms')}
              loading={sharing === 'sms'}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}

/** The latest announcement, with the way to all of them (and, for organizers, to posting one). */
function AnnouncementsSection({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const { userId } = useAuth();
  const { announcements } = useCommunication();
  const latest = announcements[0];
  const canPost = CommunicationModel.canPostAnnouncement(trip, userId);

  if (!latest) {
    return (
      <ListSection header="Announcements">
        <ListRow
          leading={<Icon name="megaphone-outline" size={22} color="accent" />}
          title={canPost ? 'Post an announcement' : 'No announcements yet'}
          subtitle={canPost ? 'Share meeting times and changes with everyone.' : 'Updates from the organizer show up here.'}
          trailing="chevron"
          accessibilityHint={canPost ? 'Opens announcements to write one' : 'Opens announcements'}
          onPress={onOpen}
        />
      </ListSection>
    );
  }
  return (
    <ListSection
      header="Announcements"
      headerAction={canPost ? { label: 'Post', hint: 'Opens announcements to write a new one', onPress: onOpen } : undefined}
    >
      <MessageRow
        kind="announcement"
        author={CommunicationModel.authorName(trip, latest.createdBy, userId)}
        avatarName={CommunicationModel.authorDisplayName(trip, latest.createdBy)}
        body={latest.body}
        time={formatRelativeTime(latest.createdAt)}
      />
      {announcements.length > 1 ? (
        <ListRow title={`See all ${announcements.length} announcements`} trailing="chevron" onPress={onOpen} />
      ) : null}
    </ListSection>
  );
}

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const { userId } = useAuth();
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip, trips, loading, error, refresh } = useTrip();
  const { items } = useItinerary();
  const { expenses } = useExpenses();
  const { items: checklistItems } = useChecklist();
  const spentCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const [sharing, setSharing] = useState<Sharing>(null);
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

  const upcoming = ItineraryModel.upcoming(items, todayISO(), UPCOMING_COUNT + 1);
  const [nextStop, ...later] = upcoming;
  const checklist = ChecklistModel.progress(checklistItems);
  const hasBudget = activeTrip.budgetCents > 0;
  const overBudget = hasBudget && spentCents > activeTrip.budgetCents;
  const alone = activeTrip.members.length === 1;

  const runShare = async (which: Exclude<Sharing, null>, action: () => Promise<void>) => {
    setSharing(which);
    setShareError(null);
    try {
      await action();
    } catch (e) {
      setShareError(getErrorMessage(e));
    } finally {
      setSharing(null);
    }
  };

  const invite = (
    <InviteSection
      trip={activeTrip}
      sharing={sharing}
      onShare={() => runShare('sheet', () => ShareService.shareInvite(activeTrip))}
      onSend={(target) => runShare(target, () => ShareService.sendInvite(activeTrip, target))}
    />
  );

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
      {shareError ? <InlineBanner tone="error" message={shareError} /> : null}

      <Reveal index={0}>
        <TripTicket trip={activeTrip} />
      </Reveal>

      {/* Getting people in comes first while you're the only member. */}
      {alone ? <Reveal index={1}>{invite}</Reveal> : null}

      <Reveal index={alone ? 2 : 1}>
        <View style={{ gap: spacing.sm }}>
          <GlanceTile
            icon="map-outline"
            label="Next stop"
            value={nextStop ? nextStop.title : 'Nothing planned yet'}
            caption={
              nextStop
                ? [
                    `${formatDayHeading(nextStop.day)}${nextStop.time ? ` · ${formatClockTime(nextStop.time)}` : ''}`,
                    nextStop.location,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Add the first stop and everyone will see it.'
            }
            hint="Opens the itinerary"
            onPress={() => navigation.navigate('Itinerary')}
          />
          <View style={[styles.tileRow, { gap: spacing.sm }]}>
            <View style={styles.tileCell}>
              <GlanceTile
                icon="wallet-outline"
                label="Budget"
                value={formatCents(spentCents)}
                caption={
                  !hasBudget
                    ? 'spent so far'
                    : overBudget
                      ? `${formatCents(spentCents - activeTrip.budgetCents)} over your ${formatCents(activeTrip.budgetCents)} budget`
                      : `of ${formatCents(activeTrip.budgetCents)}`
                }
                fraction={hasBudget ? spentCents / activeTrip.budgetCents : null}
                alert={overBudget}
                hint="Opens the budget and settle-up"
                onPress={() => navigation.navigate('Budget')}
              />
            </View>
            <View style={styles.tileCell}>
              <GlanceTile
                icon="checkbox-outline"
                label="Checklist"
                value={checklist.total === 0 ? 'No items' : `${checklist.done}/${checklist.total}`}
                caption={checklist.total === 0 ? 'Nothing on the list yet' : checklist.label}
                fraction={checklist.fraction}
                accessibilityLabel={`Checklist, ${checklist.label}`}
                hint="Opens the trip checklist"
                onPress={() => navigation.navigate('Checklist')}
              />
            </View>
          </View>
        </View>
      </Reveal>

      <Reveal index={alone ? 3 : 2}>
        <AnnouncementsSection trip={activeTrip} onOpen={() => navigation.navigate('Announcements')} />
      </Reveal>

      {later.length > 0 ? (
        <Reveal index={alone ? 4 : 3}>
          <ListSection
            header="Coming Up"
            headerAction={{
              label: 'See All',
              hint: 'Opens the full itinerary',
              onPress: () => navigation.navigate('Itinerary'),
            }}
          >
            {later.map((item) => (
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
        </Reveal>
      ) : null}

      {alone ? null : <Reveal index={4}>{invite}</Reveal>}

      <ListSection header="Share the Trip" footer="Posts never include your invite code, so only people you invite can join.">
        <ListRow
          leading={<Icon name="logo-x" size={22} color="accent" />}
          title="Post on X"
          subtitle="Tell your followers where you're headed."
          trailing={sharing === 'x' ? <ActivityIndicator color={colors.accent} accessibilityLabel="Opening X" /> : 'chevron'}
          accessibilityHint="Opens X with a post about the trip ready to edit"
          onPress={sharing ? undefined : () => runShare('x', () => ShareService.postToX(activeTrip))}
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

      <ListSection>
        <ListRow
          leading={<Icon name="settings-outline" size={22} color="accent" />}
          title="Trip Settings"
          subtitle={
            TripModel.isOrganizer(activeTrip, userId) ? 'Edit details, manage members, or delete the trip' : 'Trip details, members, or leave the trip'
          }
          trailing="chevron"
          onPress={() => navigation.navigate('TripSettings')}
        />
      </ListSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tileRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tileCell: { flexGrow: 1, flexBasis: 150 },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap' },
  shareButton: { flexGrow: 1, flexBasis: 140 },
});
