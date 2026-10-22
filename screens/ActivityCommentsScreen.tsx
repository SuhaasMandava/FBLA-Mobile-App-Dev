import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { ListSection } from '../components/ListSection';
import { MessageComposer } from '../components/MessageComposer';
import { MessageRow } from '../components/MessageRow';
import { OfflineBanner } from '../components/OfflineBanner';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../hooks/useAuth';
import { useCommunication } from '../hooks/useCommunication';
import { useItinerary } from '../hooks/useItinerary';
import { useMessageForm } from '../hooks/useMessageForm';
import { useNetwork } from '../hooks/useNetwork';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ActivityComment, CommunicationModel } from '../models/CommunicationModel';
import { ItineraryItem } from '../models/ItineraryModel';
import { validateCommentForm } from '../models/MessageForm';
import { Trip } from '../models/TripModel';
import { confirmDestructive } from '../utils/confirm';
import { formatClockTime, formatDayHeading, formatRelativeTime } from '../utils/dates';
import { RootNavigation, RootStackParamList } from './types';

/** The comment thread on one itinerary activity. The route's `itemId` picks the activity. */
export default function ActivityCommentsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  const { items } = useItinerary();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ActivityComments'>>();
  const item = items.find((i) => i.id === params.itemId);

  // Opened for an activity that's gone (deleted on another phone) or with no trip selected.
  if (!activeTrip || !item) {
    return (
      <EmptyState title="This activity is gone" body="Someone may have removed it, along with its comments.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <CommentThread key={item.id} trip={activeTrip} item={item} />;
}

/** What the comments are about, at the top of the thread. */
function ActivitySummary({ item }: { item: ItineraryItem }) {
  const { spacing } = useTheme();
  const when = `${formatDayHeading(item.day)}${item.time ? ` · ${formatClockTime(item.time)}` : ''}`;
  return (
    <Card accessible accessibilityLabel={[item.title, when, item.location].filter(Boolean).join(', ')}>
      <View style={{ gap: spacing.xxs }}>
        <AppText variant="subheadStrong" color="labelSecondary" tabular>
          {when}
        </AppText>
        <AppText variant="headline">{item.title}</AppText>
        {item.location ? (
          <View style={[styles.inline, { gap: spacing.xxs }]}>
            <Icon name="location-outline" size={14} color="labelSecondary" />
            <AppText variant="subhead" color="labelSecondary" style={styles.shrink}>
              {item.location}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function CommentThread({ trip, item }: { trip: Trip; item: ItineraryItem }) {
  const { userId } = useAuth();
  const { online } = useNetwork();
  const { items } = useItinerary();
  const { comments, error, refresh, addComment, deleteComment } = useCommunication();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const thread = CommunicationModel.commentsFor(comments, item.id);
  const form = useMessageForm({
    validate: (values) => validateCommentForm(values, { activityExists: items.some((i) => i.id === item.id) }),
    send: (body) => addComment(item.id, body),
    sentAnnouncement: 'Comment posted',
  });

  const confirmDelete = (comment: ActivityComment) =>
    confirmDestructive({
      title: 'Delete this comment?',
      message: 'It will be removed for everyone on the trip.',
      confirmLabel: 'Delete Comment',
      onConfirm: async () => {
        setDeleteError(null);
        const result = await deleteComment(comment.id);
        if (!result.ok) {
          setDeleteError(result.error);
          AccessibilityInfo.announceForAccessibility(result.error);
        }
      },
    });

  return (
    <Sheet
      footer={
        <MessageComposer
          control={form.control}
          label="Add a comment"
          placeholder="Ask a question or share a tip"
          sendLabel="Post Comment"
          onSend={form.submit}
          sending={form.submitting}
          error={form.submitError}
          disabledReason={online ? null : "You're offline. You can comment once you're connected again."}
        />
      }
    >
      <OfflineBanner />
      {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
      {deleteError ? <InlineBanner tone="error" message={deleteError} /> : null}

      <ActivitySummary item={item} />

      {thread.length === 0 ? (
        <EmptyState inline title="No comments yet" body="Start the conversation: what to bring, where to meet, or whether it's worth it." />
      ) : (
        <ListSection header={thread.length === 1 ? '1 Comment' : `${thread.length} Comments`}>
          {thread.map((c) => (
            <MessageRow
              key={c.id}
              kind="comment"
              author={CommunicationModel.authorName(trip, c.createdBy, userId)}
              avatarName={CommunicationModel.authorDisplayName(trip, c.createdBy)}
              body={c.body}
              time={formatRelativeTime(c.createdAt)}
              onDelete={CommunicationModel.canDeleteComment(c, trip, userId) ? () => confirmDelete(c) : undefined}
            />
          ))}
        </ListSection>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
});
