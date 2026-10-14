import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Button } from '../components/Button';
import { ControlledTextField } from '../components/ControlledTextField';
import { Sheet } from '../components/Sheet';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useJoinTripForm } from '../hooks/useJoinTripForm';
import { RootNavigation } from './types';

export default function JoinTripScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [done, setDone] = useState(false);
  const form = useJoinTripForm(() => setDone(true));
  useDiscardGuard(form.control, done, () => navigation.popToTop());

  return (
    <Sheet
      subtitle="Ask the trip organizer for their 6-character invite code."
      footer={
        <Button
          label="Join Trip"
          hint="Adds you to the trip that matches this code."
          onPress={form.submit}
          loading={form.submitting}
        />
      }
    >
      <ControlledTextField
        control={form.control}
        name="code"
        label="Invite code"
        helper="Six letters and numbers."
        placeholder="K7M9PQ"
        variant="code"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={10}
        returnKeyType="done"
        onSubmitEditing={form.submit}
      />
    </Sheet>
  );
}
