import { HeaderHeightContext } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Glass } from '../components/Glass';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useItinerary } from '../hooks/useItinerary';
import { useNetwork } from '../hooks/useNetwork';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { ChatEntry, ChatMessage, ChatModel } from '../models/ChatModel';
import { ItineraryItem } from '../models/ItineraryModel';
import { MESSAGE_MAX, validateChatForm } from '../models/MessageForm';
import { Trip, TripModel } from '../models/TripModel';
import { confirmDestructive } from '../utils/confirm';
import { formatClockTime, formatDayHeading, todayISO } from '../utils/dates';
import { pressFeedback } from '../utils/haptics';
import { RootNavigation } from './types';

/** The trip's group chat: plan together without leaving the app. */
export default function ChatScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Pick a trip to chat with its group.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <ChatThread key={activeTrip.id} trip={activeTrip} />;
}

function ChatThread({ trip }: { trip: Trip }) {
  const navigation = useNavigation<RootNavigation>();
  const { colors, spacing, radii, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const { userId } = useAuth();
  const { online } = useNetwork();
  const { items } = useItinerary();
  const { messages, error, refresh, send, remove, markRead } = useChat();
  const listRef = useRef<FlatList<ChatEntry>>(null);
  const [draft, setDraft] = useState('');
  const [about, setAbout] = useState<ItineraryItem | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const entries = useMemo(() => ChatModel.entries(messages), [messages]);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const upcoming = useMemo(() => {
    const today = todayISO();
    return [...items].sort((a, b) => a.day.localeCompare(b.day) || (a.time ?? '').localeCompare(b.time ?? '')).sort(
      (a, b) => Number(a.day < today) - Number(b.day < today),
    );
  }, [items]);

  // Everything on screen counts as read, and the newest message stays in view.
  useEffect(() => {
    markRead();
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, markRead]);

  const submit = async () => {
    setProblem(null);
    const checked = validateChatForm(
      { body: draft },
      { isMember: ChatModel.canSend(trip, userId), activityExists: !about || itemsById.has(about.id) },
    );
    if (!checked.ok) {
      const message = typeof checked.errors.body === 'string' ? checked.errors.body : 'Check your message.';
      if (draft.trim() !== '') setProblem(message); // an empty box just means nothing to send
      return;
    }
    setSending(true);
    pressFeedback();
    const result = await send(checked.data, about?.id ?? null);
    setSending(false);
    if (result.ok) {
      setDraft('');
      setAbout(null);
      setPicking(false);
    } else {
      setProblem(result.error);
      AccessibilityInfo.announceForAccessibility(result.error);
    }
  };

  const confirmDelete = (message: ChatMessage) =>
    confirmDestructive({
      title: 'Delete this message?',
      message: 'It will be removed for everyone on the trip.',
      confirmLabel: 'Delete Message',
      onConfirm: async () => {
        const result = await remove(message.id);
        if (!result.ok) setProblem(result.error);
      },
    });

  const canSend = draft.trim().length > 0 && !sending && online;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(e) => e.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.md, gap: 2, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <OfflineBanner />
            {error ? <InlineBanner tone="error" message={error} action={{ label: 'Try Again', onPress: refresh }} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            inline
            title="Start the conversation"
            body="Ask who's driving, where to eat, or what to pack. Everyone on the trip sees it, and you can tag an activity."
          />
        }
        renderItem={({ item: entry }) =>
          entry.kind === 'day' ? (
            <View style={[styles.dayRow, { marginVertical: spacing.sm }]}>
              <AppText variant="caption" color="labelSecondary" accessibilityRole="header">
                {formatDayHeading(entry.day)}
              </AppText>
            </View>
          ) : (
            <Bubble
              entry={entry}
              trip={trip}
              me={userId}
              item={entry.message.itemId ? (itemsById.get(entry.message.itemId) ?? null) : null}
              onOpenActivity={(itemId) => navigation.navigate('ActivityComments', { itemId })}
              onLongPress={ChatModel.canDelete(entry.message, trip, userId) ? () => confirmDelete(entry.message) : undefined}
            />
          )
        }
      />

      <View
        pointerEvents="box-none"
        style={{ paddingHorizontal: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.sm), paddingTop: spacing.xs }}
      >
        <Glass radius={radii.xl} style={[styles.composer, { maxWidth: layout.maxContentWidth, padding: spacing.sm, gap: spacing.xs }]}>
          {problem ? <InlineBanner tone="error" message={problem} /> : null}
          {!online ? <InlineBanner tone="offline" message="You're offline. You can send once you're connected again." /> : null}

          {picking ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.xs }}>
              {upcoming.length === 0 ? (
                <AppText variant="footnote" color="labelSecondary">
                  No activities yet. Add some in the Itinerary tab to tag them here.
                </AppText>
              ) : (
                upcoming.slice(0, 12).map((i) => (
                  <Chip
                    key={i.id}
                    label={`${i.title} · ${formatDayHeading(i.day)}`}
                    selected={about?.id === i.id}
                    onPress={() => {
                      setAbout(about?.id === i.id ? null : i);
                      setPicking(false);
                    }}
                  />
                ))
              )}
            </ScrollView>
          ) : null}

          {about ? (
            <View style={[styles.aboutRow, { gap: spacing.xs }]}>
              <Icon name="pricetag-outline" size={16} color="accent" />
              <AppText variant="footnote" color="labelSecondary" numberOfLines={1} style={styles.flex}>
                {`About: ${about.title}`}
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Remove the activity tag" onPress={() => setAbout(null)} hitSlop={10}>
                <Icon name="close-circle" size={20} color="labelSecondary" />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.inputRow, { gap: spacing.xs }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={picking ? 'Hide activities' : 'Tag an activity'}
              accessibilityHint="Attaches one of the trip's activities to your message"
              onPress={() => setPicking((p) => !p)}
              style={({ pressed }) => [styles.roundButton, { minWidth: layout.minTarget, minHeight: layout.minTarget }, pressed && { opacity: 0.6 }]}
            >
              <Icon name={picking ? 'close' : 'add-circle-outline'} size={26} color="accent" fixedSize />
            </Pressable>
            <TextInput
              accessibilityLabel="Message"
              accessibilityHint={`Up to ${MESSAGE_MAX} characters`}
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                if (problem) setProblem(null);
              }}
              placeholder="Message the group"
              placeholderTextColor={colors.labelSecondary}
              multiline
              maxLength={MESSAGE_MAX + 50}
              style={[
                styles.input,
                {
                  color: colors.label,
                  backgroundColor: colors.surface,
                  borderColor: colors.fieldBorder,
                  borderRadius: radii.xl,
                  paddingHorizontal: spacing.md,
                },
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !canSend, busy: sending }}
              disabled={!canSend}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.send,
                { backgroundColor: colors.accent, minWidth: layout.minTarget, minHeight: layout.minTarget },
                !canSend && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <Icon name="arrow-up" size={22} color="onAccent" fixedSize />
            </Pressable>
          </View>
        </Glass>
      </View>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.accentTint,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
        },
      ]}
    >
      <AppText variant="subheadStrong" color={selected ? 'onAccent' : 'onAccentTint'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface BubbleProps {
  entry: Extract<ChatEntry, { kind: 'message' }>;
  trip: Trip;
  me: string | null;
  item: ItineraryItem | null;
  onOpenActivity: (itemId: string) => void;
  onLongPress?: () => void;
}

/** One message: mine on the right in the accent color, others on the left with their name on the first of a run. */
function Bubble({ entry, trip, me, item, onOpenActivity, onLongPress }: BubbleProps) {
  const { colors, spacing, radii } = useTheme();
  const { message, startsRun, endsRun } = entry;
  const mine = message.createdBy === me;
  const author = TripModel.memberName(
    trip.members.find((m) => m.userId === message.createdBy) ?? { userId: '', role: 'member', displayName: 'A former member' },
  );
  const time = new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const fg = mine ? 'onAccent' : 'label';
  const spoken = `${mine ? 'You' : author}, ${time}. ${message.body}${item ? `. About ${item.title}.` : ''}`;

  return (
    <View style={[styles.bubbleRow, mine ? styles.mine : styles.theirs, { marginTop: startsRun ? spacing.sm : 0 }]}>
      {!mine ? (
        <View style={{ width: 32, marginRight: spacing.xs, justifyContent: 'flex-end' }}>
          {endsRun ? <Avatar name={trip.members.find((m) => m.userId === message.createdBy)?.displayName ?? null} size={32} /> : null}
        </View>
      ) : null}
      <View style={[styles.bubbleColumn, mine ? styles.mine : styles.theirs]}>
        {!mine && startsRun ? (
          <AppText variant="caption" color="labelSecondary" style={{ marginLeft: spacing.sm, marginBottom: 2 }}>
            {author}
          </AppText>
        ) : null}
        <Pressable
          accessible
          accessibilityLabel={spoken}
          accessibilityHint={onLongPress ? 'Press and hold to delete' : undefined}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? colors.accent : colors.surface,
              borderRadius: radii.lg,
              // The corner nearest the sender squares off on the last bubble of a run, like a tail.
              ...(endsRun ? (mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }) : null),
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs + 2,
              gap: spacing.xxs,
            },
            !mine && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
          ]}
        >
          {item ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open comments on ${item.title}`}
              onPress={() => onOpenActivity(item.id)}
              style={[styles.activityTag, { backgroundColor: mine ? colors.accentPressed : colors.accentTint, borderRadius: radii.sm }]}
            >
              <Icon name="pricetag-outline" size={14} color={mine ? 'onAccent' : 'onAccentTint'} />
              <AppText variant="footnote" color={mine ? 'onAccent' : 'onAccentTint'} numberOfLines={1} style={styles.flex}>
                {`${item.title}${item.time ? ` · ${formatClockTime(item.time)}` : ''}`}
              </AppText>
            </Pressable>
          ) : null}
          <AppText variant="body" color={fg} selectable>
            {message.body}
          </AppText>
        </Pressable>
        {endsRun ? (
          <AppText variant="caption" color="labelSecondary" style={{ marginHorizontal: spacing.sm, marginTop: 2 }}>
            {time}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dayRow: { alignItems: 'center' },
  bubbleRow: { flexDirection: 'row', maxWidth: '100%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubbleColumn: { maxWidth: '82%' },
  bubble: { alignSelf: 'stretch' },
  activityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  composer: { width: '100%', alignSelf: 'center' },
  aboutRow: { flexDirection: 'row', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  roundButton: { alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontSize: 17, paddingVertical: 10, borderWidth: 1 },
  send: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, width: 44, height: 44 },
  chip: { minHeight: 36, justifyContent: 'center' },
});
