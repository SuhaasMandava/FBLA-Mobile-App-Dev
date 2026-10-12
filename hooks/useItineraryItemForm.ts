import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { EMPTY_ITINERARY_FORM, ItineraryFormValues, validateItineraryForm } from '../models/ItineraryForm';
import { ItineraryItem, NewItineraryItem } from '../models/ItineraryModel';
import { todayISO } from '../utils/dates';
import { createResolver } from '../utils/formResolver';
import { useItinerary } from './useItinerary';
import { useTrip } from './useTrip';

interface Options {
  /** The activity being edited; leave out to add a new one. */
  item?: ItineraryItem;
  /** Day to start the new activity on (e.g. the day whose "Add" button was tapped). */
  defaultDay?: string;
  /** Runs once the activity is saved or deleted. */
  onDone: () => void;
}

/** Form state and save/delete logic for adding or editing an activity. Dates are checked against the active trip's dates. */
export function useItineraryItemForm({ item, defaultDay, onDone }: Options) {
  const { activeTrip } = useTrip();
  const { addItem, updateItem, deleteItem } = useItinerary();
  const range = { start: activeTrip?.startDate ?? '', end: activeTrip?.endDate ?? '' };

  const today = todayISO();
  const startingDay = defaultDay ?? (today >= range.start && today <= range.end ? today : range.start);

  const form = useForm<ItineraryFormValues, unknown, NewItineraryItem>({
    defaultValues: item
      ? { title: item.title, day: item.day, time: item.time ?? '', location: item.location ?? '', notes: item.notes ?? '' }
      : { ...EMPTY_ITINERARY_FORM, day: startingDay },
    resolver: createResolver((values) => validateItineraryForm(values, range)),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (message: string) => {
    setSubmitError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = form.handleSubmit(
    async (data) => {
      setSubmitError(null);
      const result = item ? await updateItem(item.id, data) : await addItem(data);
      if (result.ok) onDone();
      else fail(result.error);
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      if (first) AccessibilityInfo.announceForAccessibility(first);
    },
  );

  /** Delete the activity being edited. Returns after calling onDone, or after showing why it failed. */
  const remove = async () => {
    if (!item || deleting) return;
    setSubmitError(null);
    setDeleting(true);
    const result = await deleteItem(item.id);
    setDeleting(false);
    if (result.ok) onDone();
    else fail(result.error);
  };

  return {
    control: form.control,
    submit,
    remove,
    submitting: form.formState.isSubmitting,
    deleting,
    submitError,
    tripStart: range.start,
    tripEnd: range.end,
  };
}
