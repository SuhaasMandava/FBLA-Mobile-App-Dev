import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { OfflineBanner } from '../components/OfflineBanner';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { formatDateRange } from '../utils/dates';
import { RootNavigation } from './types';

/** Half-height sheet listing every trip; the current one is checked. */
export default function TripSwitcherScreen() {
  const { colors, spacing, scheme } = useTheme();
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const { trips, activeTripId, setActiveTripId, loading, error, refresh } = useTrip();
  const background = scheme === 'dark' ? colors.surfaceRaised : colors.background;

  const select = (id: string) => {
    setActiveTripId(id);
    navigation.goBack();
  };

  let body;
  if (trips.length === 0) {
    body = loading ? (
      <SkeletonList label="Loading your trips" />
    ) : error ? (
      <EmptyState inline tone="error" title="Couldn't load your trips" body={error}>
        <Button label="Try Again" onPress={refresh} />
      </EmptyState>
    ) : (
      <EmptyState inline title="No trips yet" body="Start a trip and invite your group, or join one with a code." />
    );
  } else {
    body = (
      <ListSection>
        {trips.map((trip) => {
          const active = trip.id === activeTripId;
          const dates = formatDateRange(trip.startDate, trip.endDate);
          return (
            <ListRow
              key={trip.id}
              title={trip.name}
              subtitle={`${trip.destination} · ${dates}`}
              trailing={active ? 'check' : undefined}
              selected={active}
              accessibilityLabel={`${trip.name}, ${trip.destination}, ${dates}`}
              accessibilityHint={active ? 'Current trip' : 'Switches to this trip'}
              onPress={() => select(trip.id)}
            />
          );
        })}
      </ListSection>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: background }]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.lg + spacing.xxs, gap: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={loading && trips.length > 0}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <AppText variant="title2" accessibilityRole="header">
          Trips
        </AppText>
        <OfflineBanner />
        {body}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            padding: spacing.md,
            paddingBottom: spacing.md + insets.bottom,
            gap: spacing.sm,
            borderTopColor: colors.separator,
            backgroundColor: background,
          },
        ]}
      >
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
        <Button label="Join with Code" variant="tinted" onPress={() => navigation.navigate('JoinTrip')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
