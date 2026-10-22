import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Platform } from 'react-native';
import { Button } from '../components/Button';
import { ControlledDateTimeField } from '../components/ControlledDateTimeField';
import { ControlledTextField } from '../components/ControlledTextField';
import { EmptyState } from '../components/EmptyState';
import { InlineBanner } from '../components/InlineBanner';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../hooks/useAuth';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useEditTripForm } from '../hooks/useEditTripForm';
import { useTrip } from '../hooks/useTrip';
import { Trip, TripModel } from '../models/TripModel';
import { todayISO } from '../utils/dates';
import { RootNavigation } from './types';

/** Change the active trip's name, destination, dates or budget. Organizers only (the database enforces it too). */
export default function EditTripScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  if (!activeTrip || !TripModel.isOrganizer(activeTrip, userId)) {
    return (
      <EmptyState title="Only organizers can edit the trip" body="Ask the trip organizer to make the change.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <EditTripForm key={activeTrip.id} trip={activeTrip} />;
}

function EditTripForm({ trip }: { trip: Trip }) {
  const navigation = useNavigation<RootNavigation>();
  const [done, setDone] = useState(false);
  const form = useEditTripForm(trip, () => setDone(true));
  useDiscardGuard(form.control, done, () => navigation.goBack());
  const startDate = useWatch({ control: form.control, name: 'startDate' });
  // A trip that has started keeps its start date; a new start date can't be in the past.
  const minStart = trip.startDate < todayISO() ? trip.startDate : todayISO();

  return (
    <Sheet
      subtitle="Everyone on the trip sees the changes."
      footer={
        <>
          <Button label="Save Changes" onPress={form.submit} loading={form.submitting} />
          {Platform.OS !== 'ios' ? (
            <Button
              label="Cancel"
              variant="tinted"
              hint="Closes this form without saving."
              onPress={() => navigation.goBack()}
              disabled={form.submitting}
            />
          ) : null}
        </>
      }
    >
      <ControlledTextField
        control={form.control}
        name="name"
        label="Trip name"
        helper="Between 3 and 50 characters."
        autoCapitalize="words"
        returnKeyType="next"
      />
      <ControlledTextField
        control={form.control}
        name="destination"
        label="Destination"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <ControlledDateTimeField
        control={form.control}
        name="startDate"
        mode="date"
        label="Start date"
        helper="The dates must still include every planned activity."
        minDate={minStart}
      />
      <ControlledDateTimeField
        control={form.control}
        name="endDate"
        mode="date"
        label="End date"
        minDate={startDate || minStart}
        initialDate={startDate || minStart}
      />
      <ControlledTextField
        control={form.control}
        name="budget"
        label="Budget (USD)"
        helper="The total for the whole trip, in dollars."
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />
      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
    </Sheet>
  );
}
