import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Platform } from 'react-native';
import { Button } from '../components/Button';
import { ControlledDateTimeField } from '../components/ControlledDateTimeField';
import { ControlledTextField } from '../components/ControlledTextField';
import { InlineBanner } from '../components/InlineBanner';
import { Sheet } from '../components/Sheet';
import { useCreateTripForm } from '../hooks/useCreateTripForm';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { todayISO } from '../utils/dates';
import { RootNavigation } from './types';

export default function CreateTripScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [done, setDone] = useState(false);
  const form = useCreateTripForm(() => setDone(true));
  useDiscardGuard(form.control, done, () => navigation.popToTop());
  const startDate = useWatch({ control: form.control, name: 'startDate' });
  const today = todayISO();

  return (
    <Sheet
      subtitle="You'll get an invite code to share with your group."
      footer={
        <>
          <Button
            label="Create Trip"
            hint="Saves the trip and generates an invite code to share."
            onPress={form.submit}
            loading={form.submitting}
          />
          {/* iOS already has Cancel in the sheet's header. Closing asks first if anything was entered. */}
          {Platform.OS !== 'ios' ? (
            <Button
              label="Cancel"
              variant="tinted"
              hint="Closes this form without creating a trip."
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
        placeholder="e.g. Smith Family Reunion"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <ControlledTextField
        control={form.control}
        name="destination"
        label="Destination"
        placeholder="Where are you headed?"
        autoCapitalize="words"
        returnKeyType="next"
      />

      {/* Stacked, not side by side: the iOS calendar opens under its field and needs the full width. */}
      <ControlledDateTimeField control={form.control} name="startDate" mode="date" label="Start date" minDate={today} />
      <ControlledDateTimeField
        control={form.control}
        name="endDate"
        mode="date"
        label="End date"
        minDate={startDate || today}
        initialDate={startDate || today}
      />

      <ControlledTextField
        control={form.control}
        name="budget"
        label="Budget (USD)"
        helper="The total for the whole trip, in dollars."
        placeholder="e.g. 1500"
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />

      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
    </Sheet>
  );
}
