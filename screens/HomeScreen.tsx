import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { formatDateRange } from '../utils/dates';
import { formatCents } from '../utils/money';
import { RootStackParamList } from './types';

function InfoCard({ label, value, spokenLabel, selectable = false }: {
  label: string;
  value: string;
  /** Overrides how a screen reader reads the card (e.g. spelling out a code). */
  spokenLabel?: string;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spokenLabel ?? `${label}: ${value}`}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text selectable={selectable} style={[styles.cardValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeTrip, trips, loading, error, refresh } = useTrip();

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

  const memberCount = activeTrip.memberIds.length;
  const inviteCode = activeTrip.inviteCode;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
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
      <InfoCard label="Members" value={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`} />
      {inviteCode ? (
        <InfoCard
          label="Invite code"
          value={inviteCode}
          selectable
          spokenLabel={`Invite code: ${inviteCode.split('').join(' ')}. Share it so others can join this trip.`}
        />
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
  card: { borderRadius: 16, padding: 16, gap: 4 },
  cardLabel: { fontSize: 12, fontWeight: '500' },
  cardValue: { fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
});
