import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Button } from '../components/Button';
import { ControlledTextField } from '../components/ControlledTextField';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../hooks/useAuth';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useDisplayNameForm } from '../hooks/useDisplayNameForm';
import { useTrip } from '../hooks/useTrip';
import { RootNavigation } from './types';

export default function EditNameScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { userId } = useAuth();
  const { trips } = useTrip();
  const current = trips.flatMap((t) => t.members).find((m) => m.userId === userId)?.displayName ?? '';
  const [done, setDone] = useState(false);
  const form = useDisplayNameForm(current, () => setDone(true));
  useDiscardGuard(form.control, done, () => navigation.goBack());

  return (
    <Sheet
      subtitle="This is the name other people on your trips see."
      footer={<Button label="Save Name" onPress={form.submit} loading={form.submitting} />}
    >
      <ControlledTextField
        control={form.control}
        name="displayName"
        label="Your name"
        helper="2 to 40 characters."
        autoCapitalize="words"
        autoComplete="name"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={() => void form.submit()}
      />
    </Sheet>
  );
}
