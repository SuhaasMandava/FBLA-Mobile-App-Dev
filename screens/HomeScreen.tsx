import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MemberAvatar } from '../components/MemberAvatar';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useItinerary } from '../hooks/useItinerary';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ItineraryModel } from '../models/ItineraryModel';
import { TripModel } from '../models/TripModel';
import { getErrorMessage } from '../services/errors';
import { ShareService } from '../services/ShareService';
import { formatClockTime, formatDateRange, formatDayHeading, todayISO } from '../utils/dates';
import { formatCents } from '../utils/money';
import { RootStackParamList, TabParamList } from './types';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const UPCOMING_COUNT = 3;

function InfoCard({ label, value, spokenLabel }: { label: string; value: string; spokenLabel?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spokenLabel ?? `${label}: ${value}`}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<HomeNavigation>();
  const { activeTrip, trips, loading, error, refresh } = useTrip();
  const { items } = useItinerary();
  const [sharing, setSharing] = useState(false);

  if (loading && trips.length === 0) return <StatusMessage loading title="Loading your trips…" />;

  if (trips.length === 0) {
    if (error) {
      return (
        <StatusMessage title="Couldn't load your trips" body={error}>
          <PrimaryButton label="Try Again" onPress={refresh} />
        </StatusMessage>
      );
    }
    return (
      <StatusMessage title="No trips yet" body="Create a trip, or join one with an invite code.">
        <PrimaryButton label="Create a Trip" onPress={() => navigation.navigate('CreateTrip')} />
        <PrimaryButton label="Join with a Code" variant="secondary" onPress={() => navigation.navigate('JoinTrip')} />
      </StatusMessage>
    );
  }

  if (!activeTrip) return null; // setTrips always selects one when trips exist

  const inviteCode = activeTrip.inviteCode;
  const upcoming = ItineraryModel.upcoming(items, todayISO(), UPCOMING_COUNT);
  const memberSummary = activeTrip.members
    .map((m) => `${TripModel.memberName(m)}${m.role === 'organizer' ? ', organizer' : ''}`)
    .join('; ');

  const share = async () => {
    setSharing(true);
    try {
      await ShareService.shareInvite(activeTrip);
    } catch (e) {
      Alert.alert("Couldn't share", getErrorMessage(e));
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <OfflineBanner />
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${activeTrip.name}, current trip`}
          accessibilityHint="Opens the trip switcher"
          onPress={() => navigation.navigate('TripSwitcher')}
          style={styles.titleRow}
        >
          <Text style={[styles.title, { color: colors.text }]}>{activeTrip.name}</Text>
          <Text
            style={[styles.chevron, { color: colors.textMuted }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            ▾
          </Text>
        </Pressable>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {activeTrip.destination} · {formatDateRange(activeTrip.startDate, activeTrip.endDate)}
        </Text>
      </View>

      <InfoCard label="Budget" value={activeTrip.budgetCents > 0 ? formatCents(activeTrip.budgetCents) : 'Not set'} />

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text accessibilityRole="header" style={[styles.cardLabel, { color: colors.textMuted }]}>
            Coming up
          </Text>
          {upcoming.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See the full itinerary"
              onPress={() => navigation.navigate('Itinerary')}
              style={styles.seeAll}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
            </Pressable>
          ) : null}
        </View>
        {upcoming.length === 0 ? (
          <>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nothing planned yet.</Text>
            <PrimaryButton label="Plan the Itinerary" variant="secondary" onPress={() => navigation.navigate('Itinerary')} />
          </>
        ) : (
          upcoming.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${formatDayHeading(item.day)}${item.time ? `, ${formatClockTime(item.time)}` : ''}`}
              accessibilityHint="Opens the itinerary"
              onPress={() => navigation.navigate('Itinerary')}
              style={styles.upcomingRow}
            >
              <Text style={[styles.upcomingWhen, { color: colors.primary }]}>
                {formatDayHeading(item.day)}
                {item.time ? ` · ${formatClockTime(item.time)}` : ''}
              </Text>
              <Text style={[styles.upcomingTitle, { color: colors.text }]}>{item.title}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View
        accessible
        accessibilityLabel={`Members, ${activeTrip.members.length}: ${memberSummary}`}
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
          Members · {activeTrip.members.length}
        </Text>
        {activeTrip.members.map((member) => (
          <View key={member.userId} style={styles.memberRow}>
            <MemberAvatar name={member.displayName} />
            <Text style={[styles.memberName, { color: colors.text }]}>{TripModel.memberName(member)}</Text>
            {member.role === 'organizer' ? (
              <Text style={[styles.memberRole, { color: colors.textMuted }]}>Organizer</Text>
            ) : null}
          </View>
        ))}
      </View>

      {inviteCode ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View
            accessible
            accessibilityLabel={`Invite code: ${inviteCode.split('').join(' ')}. Share it so others can join this trip.`}
          >
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Invite code</Text>
            <Text selectable style={[styles.cardValue, { color: colors.text }]}>
              {inviteCode}
            </Text>
          </View>
          <PrimaryButton
            label="Share Invite Code"
            hint="Opens the share sheet to send the code to friends."
            onPress={share}
            loading={sharing}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  header: { gap: 4, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', flexShrink: 1 },
  chevron: { fontSize: 16 },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 12, fontWeight: '500' },
  cardValue: { fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
  seeAll: { minHeight: 44, minWidth: 60, alignItems: 'flex-end', justifyContent: 'center', marginVertical: -12 },
  seeAllText: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14 },
  upcomingRow: { minHeight: 44, justifyContent: 'center', gap: 2 },
  upcomingWhen: { fontSize: 13, fontWeight: '600' },
  upcomingTitle: { fontSize: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  memberName: { fontSize: 16, flexShrink: 1 },
  memberRole: { fontSize: 13, marginLeft: 'auto' },
});
