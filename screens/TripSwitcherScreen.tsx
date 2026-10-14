import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { formatDateRange } from '../utils/dates';
import { RootStackParamList } from './types';

export default function TripSwitcherScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { trips, activeTripId, setActiveTripId, loading, error, refresh } = useTrip();

  const select = (id: string) => {
    setActiveTripId(id);
    navigation.goBack();
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.label }]}>
        Your Trips
      </Text>
      <OfflineBanner style={styles.banner} />
      <FlatList
        data={trips}
        keyExtractor={(trip) => trip.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading && trips.length > 0} onRefresh={refresh} />}
        ListEmptyComponent={
          loading ? (
            <StatusMessage loading title="Loading your trips…" />
          ) : error ? (
            <StatusMessage title="Couldn't load your trips" body={error}>
              <PrimaryButton label="Try Again" onPress={refresh} />
            </StatusMessage>
          ) : (
            <StatusMessage title="No trips yet" body="Create a trip, or join one with an invite code." />
          )
        }
        renderItem={({ item: trip }) => {
          const active = trip.id === activeTripId;
          const dates = formatDateRange(trip.startDate, trip.endDate);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${trip.name}, ${trip.destination}, ${dates}`}
              accessibilityHint={active ? 'Current trip' : 'Switches to this trip'}
              accessibilityState={{ selected: active }}
              onPress={() => select(trip.id)}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: active ? colors.accent : 'transparent' },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: colors.label }]}>{trip.name}</Text>
                <Text style={[styles.meta, { color: colors.labelSecondary }]}>
                  {trip.destination} · {dates}
                </Text>
              </View>
              {active ? (
                <Text
                  style={[styles.check, { color: colors.accent }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  ✓
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: colors.separator, paddingBottom: 16 + insets.bottom }]}>
        <PrimaryButton label="Create New Trip" onPress={() => navigation.navigate('CreateTrip')} />
        <PrimaryButton label="Join with a Code" variant="secondary" onPress={() => navigation.navigate('JoinTrip')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16, paddingTop: 28 },
  banner: { marginHorizontal: 16, marginTop: 12 },
  list: { flexGrow: 1, padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  check: { fontSize: 18, fontWeight: '700' },
  footer: { padding: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
