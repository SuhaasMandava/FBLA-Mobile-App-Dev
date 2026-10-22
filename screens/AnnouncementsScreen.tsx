import { useNavigation } from '@react-navigation/native';
import { AccessibilityInfo } from 'react-native';
import { useState } from 'react';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { InlineBanner } from '../components/InlineBanner';
import { ListSection } from '../components/ListSection';
import { MessageComposer } from '../components/MessageComposer';
import { MessageRow } from '../components/MessageRow';
import { OfflineBanner } from '../components/OfflineBanner';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../hooks/useAuth';
import { useCommunication } from '../hooks/useCommunication';
import { useMessageForm } from '../hooks/useMessageForm';
import { useNetwork } from '../hooks/useNetwork';
import { useTrip } from '../hooks/useTrip';
import { Announcement, CommunicationModel } from '../models/CommunicationModel';
import { validateAnnouncementForm } from '../models/MessageForm';
import { Trip } from '../models/TripModel';
import { confirmDestructive } from '../utils/confirm';
import { formatRelativeTime } from '../utils/dates';
import { RootNavigation } from './types';

/** Every announcement on the active trip, newest first. Organizers post from the box at the bottom. */
export default function AnnouncementsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Pick a trip to see its announcements.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <AnnouncementsThread key={activeTrip.id} trip={activeTrip} />;
}

function AnnouncementsThread({ trip }: { trip: Trip }) {
  const { userId } = useAuth();
  const { online } = useNetwork();
  const { announcements, error, refresh, postAnnouncement, deleteAnnouncement } = useCommunication();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isOrganizer = CommunicationModel.canPostAnnouncement(trip, userId);
  const form = useMessageForm({
    validate: (values) => validateAnnouncementForm(values, { isOrganizer }),
    send: postAnnouncement,
    sentAnnouncement: 'Announcement posted',
  });

  const confirmDelete = (announcement: Announcement) =>
    confirmDestructive({
      title: 'Delete this announcement?',
      message: 'It will be removed for everyone on the trip.',
      confirmLabel: 'Delete Announcement',
      onConfirm: async () => {
        setDeleteError(null);
        const result = await deleteAnnouncement(announcement.id);
        if (!result.ok) {
          setDeleteError(result.error);
          AccessibilityInfo.announceForAccessibility(result.error);
        }
      },
    });

  return (
    <Sheet
      subtitle={
        isOrganizer
          ? 'Post updates the whole group should see: meeting times, changes, reminders.'
          : 'Updates from the trip organizer.'
      }
      footer={
        isOrganizer ? (
          <MessageComposer
            control={form.control}
            label="New announcement"
            placeholder="e.g. Meet in the lobby at 8:00 tomorrow"
            sendLabel="Post Announcement"
            onSend={form.submit}
            sending={form.submitting}
            error={form.submitError}
            disabledReason={online ? null : "You're offline. You can post once you're connected again."}
          />
        ) : undefined
      }
    >
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
      {deleteError ? <InlineBanner tone="error" message={deleteError} /> : null}

      {announcements.length === 0 ? (
        <EmptyState
          inline
          title="No announcements yet"
          body={
            isOrganizer
              ? 'Write your first update below. Everyone on the trip will see it.'
              : "When the organizer posts an update, it'll show up here."
          }
        />
      ) : (
        <ListSection header={`Announcements · ${announcements.length}`}>
          {announcements.map((a) => (
            <MessageRow
              key={a.id}
              kind="announcement"
              author={CommunicationModel.authorName(trip, a.createdBy, userId)}
              avatarName={CommunicationModel.authorDisplayName(trip, a.createdBy)}
              body={a.body}
              time={formatRelativeTime(a.createdAt)}
              onDelete={CommunicationModel.canDeleteAnnouncement(trip, userId) ? () => confirmDelete(a) : undefined}
            />
          ))}
        </ListSection>
      )}
    </Sheet>
  );
}
