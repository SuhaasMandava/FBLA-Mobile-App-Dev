import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Button } from '../components/Button';
import { ControlledDateTimeField } from '../components/ControlledDateTimeField';
import { ControlledTextField } from '../components/ControlledTextField';
import { EmptyState } from '../components/EmptyState';
import { InlineBanner } from '../components/InlineBanner';
import { Sheet } from '../components/Sheet';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useItinerary } from '../hooks/useItinerary';
import { useItineraryItemForm } from '../hooks/useItineraryItemForm';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useTrip } from '../hooks/useTrip';
import { ItineraryItem } from '../models/ItineraryModel';
import { confirmDestructive } from '../utils/confirm';
import { RootNavigation, RootStackParamList } from './types';

/** Add or edit one activity. The route's `itemId` selects edit mode. */
export default function ItineraryItemScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  const { items } = useItinerary();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ItineraryItem'>>();
  const item = params?.itemId ? items.find((i) => i.id === params.itemId) : undefined;

  // Opened for an activity that's gone (deleted on another phone) or with no trip selected.
  if (!activeTrip || (params?.itemId && !item)) {
    return (
      <EmptyState title="This activity is gone" body="Someone may have removed it. Go back and pull down to refresh.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <ItineraryItemForm key={item?.id ?? 'new'} item={item} defaultDay={params?.day} />;
}

function ItineraryItemForm({ item, defaultDay }: { item?: ItineraryItem; defaultDay?: string }) {
  const navigation = useNavigation<RootNavigation>();
  const [done, setDone] = useState(false);
  const { prefs, permission, requestPermission } = useNotificationSettings();
  const form = useItineraryItemForm({
    item,
    defaultDay,
    onDone: (saved) => {
      // An activity with a start time is when a reminder first makes sense, so ask then (once).
      if (saved?.time && prefs.activityReminders && permission === 'undetermined') void requestPermission();
      setDone(true);
    },
  });
  useDiscardGuard(form.control, done, () => navigation.goBack());

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${item?.title}"?`,
      message: 'It will be removed from the itinerary for everyone on the trip.',
      confirmLabel: 'Delete Activity',
      onConfirm: form.remove,
    });

  return (
    <Sheet
      footer={
        <>
          <Button
            label={item ? 'Save Changes' : 'Add Activity'}
            onPress={form.submit}
            loading={form.submitting}
            disabled={form.deleting}
          />
          {item ? (
            <Button
              label="Delete Activity"
              variant="destructive"
              icon="trash-outline"
              onPress={confirmDelete}
              loading={form.deleting}
              disabled={form.submitting}
            />
          ) : null}
        </>
      }
    >
      <ControlledTextField
        control={form.control}
        name="title"
        label="Title"
        placeholder="e.g. Morning hike"
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      <ControlledDateTimeField
        control={form.control}
        name="day"
        mode="date"
        label="Day"
        helper="Must be within the trip dates."
        minDate={form.tripStart}
        maxDate={form.tripEnd}
      />

      <ControlledDateTimeField
        control={form.control}
        name="time"
        mode="time"
        label="Time (optional)"
        placeholder="No time set"
        clearable
      />

      <ControlledTextField
        control={form.control}
        name="location"
        label="Location (optional)"
        placeholder="e.g. Lakeside trailhead"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <ControlledTextField
        control={form.control}
        name="notes"
        label="Notes (optional)"
        placeholder="Anything the group should know"
        multiline
        autoCapitalize="sentences"
      />

      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
    </Sheet>
  );
}
