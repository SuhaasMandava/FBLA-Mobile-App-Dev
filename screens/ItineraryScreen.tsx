import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { HeaderButton } from '../components/HeaderButton';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { OfflineBanner } from '../components/OfflineBanner';
import { DottedLine, RouteStop } from '../components/Route';
import { Screen } from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { useCommunication } from '../hooks/useCommunication';
import { useItinerary } from '../hooks/useItinerary';
import { useLargeText } from '../hooks/useLargeText';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { CommunicationModel } from '../models/CommunicationModel';
import { ItineraryItem, ItineraryModel } from '../models/ItineraryModel';
import { daysBetween, formatClockTime, formatDayHeading, todayISO } from '../utils/dates';
import { TabScreenNavigation } from './types';

const RAIL = 28;

interface StopRowProps {
  item: ItineraryItem;
  state: 'past' | 'current' | 'future';
  first: boolean;
  last: boolean;
  editing: boolean;
  commentCount: number;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onComments: () => void;
}

/**
 * One activity, hung on the Route. Reorder arrows show in edit mode; screen readers always get Move actions.
 * Otherwise a separate comments button (with the count) opens the activity's thread.
 */
function StopRow({ item, state, first, last, editing, commentCount, onOpen, onMove, onComments }: StopRowProps) {
  const { colors, spacing, radii, layout, motion } = useTheme();
  const largeText = useLargeText();
  const spoken = [item.time ? formatClockTime(item.time) : null, item.title, item.location].filter(Boolean).join(', ');

  const actions = [
    ...(first ? [] : [{ name: 'moveEarlier', label: 'Move earlier' }]),
    ...(last ? [] : [{ name: 'moveLater', label: 'Move later' }]),
  ];

  return (
    <View style={styles.stopRow}>
      <View style={[styles.rail, { width: RAIL }]}>
        <View style={styles.railSegment}>{first ? null : <DottedLine faded={state === 'future'} />}</View>
        <RouteStop state={state} />
        <View style={styles.railSegment}>{last ? null : <DottedLine faded={state === 'future'} />}</View>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radii.lg, marginVertical: spacing.xxs, marginLeft: spacing.xs },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityHint="Opens the activity to edit or delete it"
          accessibilityActions={actions}
          onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'moveEarlier' ? -1 : 1)}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.cardMain,
            { minHeight: layout.minTarget + 12, padding: spacing.sm, paddingLeft: spacing.md, gap: 2 },
            pressed && { opacity: motion.pressedOpacity },
          ]}
        >
          {item.time ? (
            <AppText variant="subheadStrong" color="labelSecondary" tabular>
              {formatClockTime(item.time)}
            </AppText>
          ) : null}
          <AppText variant="headline">{item.title}</AppText>
          {item.location ? (
            <View style={[styles.inline, { gap: spacing.xxs }]}>
              <Icon name="location-outline" size={14} color="labelSecondary" />
              <AppText variant="subhead" color="labelSecondary" style={styles.shrink}>
                {item.location}
              </AppText>
            </View>
          ) : null}
        </Pressable>
        {editing ? (
          // Edit mode's reorder buttons. Screen readers can also use the row's Move actions at any time.
          <View style={[styles.reorder, largeText && styles.reorderStacked]}>
            {([-1, 1] as const).map((direction) => {
              const disabled = direction === -1 ? first : last;
              return (
                <Pressable
                  key={direction}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.title} ${direction === -1 ? 'earlier' : 'later'}`}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => onMove(direction)}
                  style={({ pressed }) => [
                    styles.arrow,
                    { width: layout.minTarget, minHeight: layout.minTarget },
                    disabled && styles.arrowDisabled,
                    pressed && { opacity: motion.pressedOpacity },
                  ]}
                >
                  <Icon name={direction === -1 ? 'arrow-up' : 'arrow-down'} size={20} color="accent" />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Comments on ${item.title}, ${
              commentCount === 0 ? 'none yet' : commentCount === 1 ? '1 comment' : `${commentCount} comments`
            }`}
            onPress={onComments}
            style={({ pressed }) => [
              styles.comments,
              { minWidth: layout.minTarget, minHeight: layout.minTarget, paddingHorizontal: spacing.xs, gap: 2 },
              pressed && { opacity: motion.pressedOpacity },
            ]}
          >
            <Icon name={commentCount > 0 ? 'chatbubble-ellipses' : 'chatbubble-outline'} size={20} color="accent" />
            {commentCount > 0 ? (
              <AppText variant="caption" color="accent" tabular>
                {commentCount}
              </AppText>
            ) : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ItineraryScreen() {
  const { colors, spacing, layout } = useTheme();
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip } = useTrip();
  const { items, loading, error, refresh, moveItem } = useItinerary();
  const { comments } = useCommunication();
  const commentCounts = CommunicationModel.commentCounts(comments);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const days = activeTrip ? daysBetween(activeTrip.startDate, activeTrip.endDate) : [];
  const today = todayISO();
  const firstDay = days.includes(today) ? today : days[0];
  const canEdit = items.length > 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: activeTrip
        ? () => (
            <View style={styles.inline}>
              {canEdit ? (
                <HeaderButton
                  label={editing ? 'Done' : 'Edit'}
                  prominent={editing}
                  accessibilityLabel={editing ? 'Done reordering' : 'Reorder activities'}
                  onPress={() => setEditing((e) => !e)}
                />
              ) : null}
              <HeaderButton
                icon="add"
                accessibilityLabel="Add activity"
                onPress={() => navigation.navigate('ItineraryItem', { day: firstDay })}
              />
            </View>
          )
        : undefined,
    });
  }, [navigation, activeTrip, canEdit, editing, firstDay]);

  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Create a trip, or join one with a code, to plan its days.">
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
        <Button label="Join with Code" variant="tinted" onPress={() => navigation.navigate('JoinTrip')} />
      </EmptyState>
    );
  }
  if (loading && items.length === 0) {
    return (
      <Screen>
        <SkeletonList rows={4} label="Loading the itinerary" />
      </Screen>
    );
  }
  if (error && items.length === 0) {
    return (
      <EmptyState tone="error" title="Couldn't load the itinerary" body={error}>
        <Button label="Try Again" onPress={refresh} />
      </EmptyState>
    );
  }

  const sections = ItineraryModel.groupByDay(items, days).map((group, index) => ({
    day: group.day,
    index,
    data: group.items,
  }));

  const move = async (item: ItineraryItem, direction: -1 | 1) => {
    const result = await moveItem(item.id, direction);
    setMoveError(result.ok ? null : result.error);
  };

  const stateOf = (day: string) => (day < today ? 'past' : day === today ? 'current' : 'future');

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { padding: spacing.md, paddingBottom: spacing.xl, maxWidth: layout.maxContentWidth },
      ]}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />
      }
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <OfflineBanner />
          {error || moveError ? (
            <InlineBanner
              tone="error"
              message={moveError ?? error ?? ''}
              action={moveError ? undefined : { label: 'Try Again', onPress: refresh }}
            />
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={[styles.dayHeader, { marginTop: spacing.lg, marginBottom: spacing.xxs, gap: spacing.xs }]}>
          <View style={[styles.dayTitle, { gap: spacing.xs }]}>
            <AppText variant="title3" accessibilityRole="header">
              {`Day ${section.index + 1} · ${formatDayHeading(section.day)}`}
            </AppText>
            {section.day === today ? <Badge label="Today" /> : null}
          </View>
          <Button
            variant="plain"
            compact
            icon="add"
            label="Add"
            hint={`Adds an activity on ${formatDayHeading(section.day)}`}
            onPress={() => navigation.navigate('ItineraryItem', { day: section.day })}
          />
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? (
          <View style={[styles.emptyDay, { paddingLeft: RAIL + spacing.xs, paddingVertical: spacing.xxs }]}>
            <AppText variant="subhead" color="labelSecondary">
              Nothing planned. Tap Add to plan this day.
            </AppText>
          </View>
        ) : null
      }
      renderItem={({ item, index, section }) => (
        <StopRow
          item={item}
          state={stateOf(section.day)}
          first={index === 0}
          last={index === section.data.length - 1}
          editing={editing}
          commentCount={commentCounts[item.id] ?? 0}
          onOpen={() => navigation.navigate('ItineraryItem', { itemId: item.id })}
          onMove={(direction) => move(item, direction)}
          onComments={() => navigation.navigate('ActivityComments', { itemId: item.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', alignSelf: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  dayTitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flexShrink: 1 },
  emptyDay: { minHeight: 32, justifyContent: 'center' },
  stopRow: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { alignItems: 'center' },
  railSegment: { flex: 1, minHeight: 8, alignItems: 'center' },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  cardMain: { flex: 1, justifyContent: 'center' },
  reorder: { flexDirection: 'row' },
  reorderStacked: { flexDirection: 'column' },
  arrow: { alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.3 },
  comments: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
});
