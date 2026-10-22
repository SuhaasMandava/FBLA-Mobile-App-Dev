import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Button } from '../components/Button';
import { ControlledTextField } from '../components/ControlledTextField';
import { InlineBanner } from '../components/InlineBanner';
import { Sheet } from '../components/Sheet';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useJoinTripForm } from '../hooks/useJoinTripForm';
import { useTrip } from '../hooks/useTrip';
import { normalizeInviteCode } from '../utils/inviteCode';
import { RootNavigation, RootStackParamList } from './types';

export default function JoinTripScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'JoinTrip'>>();
  // A new join link while this sheet is open starts the form over with that code.
  return <JoinTripForm key={params?.code ?? 'typed'} linkCode={params?.code} />;
}

function JoinTripForm({ linkCode }: { linkCode?: string }) {
  const navigation = useNavigation<RootNavigation>();
  const { trips, setActiveTripId } = useTrip();
  const [done, setDone] = useState(false);
  const form = useJoinTripForm(() => setDone(true), linkCode);
  useDiscardGuard(form.control, done, () => navigation.popToTop());

  // Opened from a link for a trip you're already on: offer to open it instead of failing on Join
  // (only while the box still holds the link's code; a typed code joins as usual).
  const typed = normalizeInviteCode(useWatch({ control: form.control, name: 'code' }) ?? '');
  const alreadyOn =
    linkCode && typed === normalizeInviteCode(linkCode) ? trips.find((t) => t.inviteCode === typed) : undefined;

  return (
    <Sheet
      subtitle={
        linkCode
          ? 'You were sent an invite link. Check the code, then tap Join Trip.'
          : 'Ask the trip organizer for their 6-character invite code.'
      }
      footer={
        alreadyOn ? (
          <Button
            label="Open Trip"
            hint={`Switches to ${alreadyOn.name}`}
            onPress={() => {
              setActiveTripId(alreadyOn.id);
              navigation.popToTop();
            }}
          />
        ) : (
          <Button
            label="Join Trip"
            hint="Adds you to the trip that matches this code."
            onPress={form.submit}
            loading={form.submitting}
          />
        )
      }
    >
      {alreadyOn ? <InlineBanner tone="warning" message={`You're already on "${alreadyOn.name}".`} /> : null}
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
