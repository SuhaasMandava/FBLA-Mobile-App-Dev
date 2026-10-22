import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Button } from '../components/Button';
import { ChecklistProgress } from '../components/ChecklistProgress';
import { ChecklistRow } from '../components/ChecklistRow';
import { EmptyState } from '../components/EmptyState';
import { HeaderButton } from '../components/HeaderButton';
import { InlineBanner } from '../components/InlineBanner';
import { ListSection } from '../components/ListSection';
import { OfflineBanner } from '../components/OfflineBanner';
import { Screen } from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useChecklist } from '../hooks/useChecklist';
import { useTrip } from '../hooks/useTrip';
import { CHECKLIST_SECTION_TITLES, ChecklistModel } from '../models/ChecklistModel';
import { TabScreenNavigation } from './types';

/** The active trip's shared checklist: packing, to-dos and bookings, with who is on each and who finished it. */
export default function ChecklistScreen() {
  const navigation = useNavigation<TabScreenNavigation>();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { items, loading, error, refresh, setDone } = useChecklist();
  const [actionError, setActionError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: activeTrip
        ? () => <HeaderButton icon="add" accessibilityLabel="Add checklist item" onPress={() => navigation.navigate('ChecklistItem')} />
        : undefined,
    });
  }, [navigation, activeTrip]);

  const progress = useMemo(() => ChecklistModel.progress(items), [items]);
  const groups = useMemo(() => ChecklistModel.groupByCategory(items), [items]);

  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Create or join a trip to share a packing list and to-dos with the group.">
        <Button label="Create Trip" icon="add" onPress={() => navigation.navigate('CreateTrip')} />
        <Button label="Join with Code" variant="tinted" onPress={() => navigation.navigate('JoinTrip')} />
      </EmptyState>
    );
  }
  if (loading && items.length === 0) {
    return (
      <Screen>
        <SkeletonList rows={4} label="Loading checklist" />
      </Screen>
    );
  }
  if (error && items.length === 0) {
    return (
      <EmptyState tone="error" title="Couldn't load the checklist" body={error}>
        <Button label="Try Again" onPress={refresh} />
      </EmptyState>
    );
  }

  const toggle = async (id: string, done: boolean) => {
    setActionError(null);
    const result = await setDone(id, done);
    if (!result.ok) {
      setActionError(result.error);
      AccessibilityInfo.announceForAccessibility(result.error);
    }
  };

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
      {actionError ? <InlineBanner tone="error" message={actionError} /> : null}

      <ChecklistProgress progress={progress} />

      {groups.length === 0 ? (
        <ListSection header="Checklist">
          <EmptyState inline title="Nothing on the list yet" body="Add what to pack, what to do and what to book. Everyone on the trip sees the same list.">
            <Button label="Add Item" variant="tinted" icon="add" onPress={() => navigation.navigate('ChecklistItem')} />
          </EmptyState>
        </ListSection>
      ) : (
        groups.map(({ category, items: groupItems }) => {
          const doneCount = groupItems.filter((i) => i.done).length;
          return (
            <ListSection
              key={category}
              header={`${CHECKLIST_SECTION_TITLES[category]} · ${doneCount} of ${groupItems.length}`}
              headerAction={{
                label: 'Add',
                hint: `Adds an item to ${CHECKLIST_SECTION_TITLES[category]}`,
                onPress: () => navigation.navigate('ChecklistItem', { category }),
              }}
            >
              {groupItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  detail={ChecklistModel.detailLine(item, activeTrip, userId)}
                  onToggle={() => toggle(item.id, !item.done)}
                  onEdit={() => navigation.navigate('ChecklistItem', { itemId: item.id })}
                />
              ))}
            </ListSection>
          );
        })
      )}
    </Screen>
  );
}
