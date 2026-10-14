import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlledDateTimeField } from '../components/ControlledDateTimeField';
import { ControlledFormField } from '../components/ControlledFormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useItinerary } from '../hooks/useItinerary';
import { useItineraryItemForm } from '../hooks/useItineraryItemForm';
import { useTheme } from '../hooks/useTheme';
import { ItineraryItem } from '../models/ItineraryModel';
import { useTrip } from '../hooks/useTrip';
import { RootStackParamList } from './types';

/** Add or edit one activity. The route's `itemId` selects edit mode. */
export default function ItineraryItemScreen() {
  const { activeTrip } = useTrip();
  const { items } = useItinerary();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ItineraryItem'>>();
  const item = params?.itemId ? items.find((i) => i.id === params.itemId) : undefined;

  // Opened for an activity that's gone (deleted on another phone) or with no trip selected.
  if (!activeTrip || (params?.itemId && !item)) {
    return <StatusMessage title="That activity isn't available" body="It may have been removed. Go back and refresh." />;
  }
  return <ItineraryItemForm key={item?.id ?? 'new'} item={item} defaultDay={params?.day} />;
}

function ItineraryItemForm({ item, defaultDay }: { item?: ItineraryItem; defaultDay?: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const form = useItineraryItemForm({ item, defaultDay, onDone: () => navigation.goBack() });

  const confirmDelete = () =>
    Alert.alert('Delete this activity?', `"${item?.title}" will be removed from the itinerary.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: form.remove },
    ]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <ControlledFormField
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

        <ControlledFormField
          control={form.control}
          name="location"
          label="Location (optional)"
          placeholder="e.g. Lakeside trailhead"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <ControlledFormField
          control={form.control}
          name="notes"
          label="Notes (optional)"
          placeholder="Anything the group should know"
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
        />

        {form.submitError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.submitError, { color: colors.danger }]}
          >
            {form.submitError}
          </Text>
        ) : null}

        <PrimaryButton
          label={item ? 'Save Changes' : 'Add Activity'}
          onPress={form.submit}
          loading={form.submitting}
          disabled={form.deleting}
        />
        {item ? (
          <PrimaryButton
            label="Delete Activity"
            variant="danger"
            onPress={confirmDelete}
            loading={form.deleting}
            disabled={form.submitting}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  submitError: { fontSize: 14 },
});
