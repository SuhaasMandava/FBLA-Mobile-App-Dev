import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useItinerary } from '../hooks/useItinerary';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ItineraryItem, ItineraryModel } from '../models/ItineraryModel';
import { daysBetween, formatClockTime, formatDayHeading, todayISO } from '../utils/dates';
import { RootStackParamList } from './types';

export default function ItineraryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeTrip } = useTrip();
  const { items, loading, error, refresh, moveItem } = useItinerary();
  const [moveError, setMoveError] = useState<string | null>(null);

  if (!activeTrip) {
    return (
      <StatusMessage title="No trip selected" body="Create a trip, or join one with an invite code, to plan its itinerary.">
        <PrimaryButton label="Create a Trip" onPress={() => navigation.navigate('CreateTrip')} />
        <PrimaryButton label="Join with a Code" variant="secondary" onPress={() => navigation.navigate('JoinTrip')} />
      </StatusMessage>
    );
  }
  if (loading && items.length === 0) return <StatusMessage loading title="Loading itinerary…" />;
  if (error && items.length === 0) {
    return (
      <StatusMessage title="Couldn't load the itinerary" body={error}>
        <PrimaryButton label="Try Again" onPress={refresh} />
      </StatusMessage>
    );
  }

  const days = daysBetween(activeTrip.startDate, activeTrip.endDate);
  const today = todayISO();
  const firstDay = days.includes(today) ? today : days[0];
  const sections = ItineraryModel.groupByDay(items, days).map((group) => ({ day: group.day, data: group.items }));

  const move = async (item: ItineraryItem, direction: -1 | 1) => {
    const result = await moveItem(item.id, direction);
    setMoveError(result.ok ? null : result.error);
  };

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <OfflineBanner />
          {error || moveError ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
              {moveError ?? error}
            </Text>
          ) : null}
          <PrimaryButton
            label="Add Activity"
            hint="Adds something to the trip's day-by-day plan."
            onPress={() => navigation.navigate('ItineraryItem', { day: firstDay })}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.dayHeader}>
          <Text accessibilityRole="header" style={[styles.dayTitle, { color: colors.label }]}>
            {formatDayHeading(section.day)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add activity on ${formatDayHeading(section.day)}`}
            onPress={() => navigation.navigate('ItineraryItem', { day: section.day })}
            style={styles.addDay}
          >
            <Text style={[styles.addDayText, { color: colors.accent }]}>+ Add</Text>
          </Pressable>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? (
          <Text style={[styles.empty, { color: colors.labelSecondary }]}>Nothing planned yet.</Text>
        ) : null
      }
      renderItem={({ item, index, section }) => (
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[item.title, item.time ? formatClockTime(item.time) : null, item.location]
              .filter(Boolean)
              .join(', ')}
            accessibilityHint="Opens the activity to edit or delete it"
            onPress={() => navigation.navigate('ItineraryItem', { itemId: item.id })}
            style={styles.rowMain}
          >
            {item.time ? <Text style={[styles.time, { color: colors.accent }]}>{formatClockTime(item.time)}</Text> : null}
            <Text style={[styles.title, { color: colors.label }]}>{item.title}</Text>
            {item.location ? <Text style={[styles.location, { color: colors.labelSecondary }]}>{item.location}</Text> : null}
          </Pressable>

          <View style={styles.reorder}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${item.title} earlier`}
              accessibilityState={{ disabled: index === 0 }}
              disabled={index === 0}
              onPress={() => move(item, -1)}
              style={[styles.arrow, index === 0 && styles.arrowDisabled]}
            >
              <Text style={[styles.arrowText, { color: colors.label }]}>▲</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${item.title} later`}
              accessibilityState={{ disabled: index === section.data.length - 1 }}
              disabled={index === section.data.length - 1}
              onPress={() => move(item, 1)}
              style={[styles.arrow, index === section.data.length - 1 && styles.arrowDisabled]}
            >
              <Text style={[styles.arrowText, { color: colors.label }]}>▼</Text>
            </Pressable>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  listHeader: { gap: 12, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  dayTitle: { fontSize: 17, fontWeight: '700' },
  addDay: { minHeight: 44, minWidth: 60, alignItems: 'flex-end', justifyContent: 'center' },
  addDayText: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 14, paddingVertical: 4 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14 },
  rowMain: { flex: 1, minHeight: 56, paddingVertical: 12, paddingLeft: 16, gap: 2, justifyContent: 'center' },
  time: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600' },
  location: { fontSize: 13 },
  reorder: { flexDirection: 'row' },
  arrow: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.25 },
  arrowText: { fontSize: 16 },
});
