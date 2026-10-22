import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

interface MessageRowProps {
  /** "You", the member's name, or "A former member". */
  author: string;
  /** Name to draw initials from; null shows "?". */
  avatarName: string | null;
  body: string;
  /** "5 min ago", "Yesterday"... */
  time: string;
  /** Shown only to people allowed to delete it. Asks first (the caller confirms). */
  onDelete?: () => void;
  /** What's being deleted, for the screen reader ("announcement", "comment"). */
  kind: string;
}

/**
 * One announcement or comment: who wrote it, when, and the text. The delete button is a
 * separate 44 pt target, so reading a message can never delete it by accident.
 */
export function MessageRow({ author, avatarName, body, time, onDelete, kind }: MessageRowProps) {
  const { spacing, layout, motion } = useTheme();
  return (
    <View style={[styles.row, { paddingLeft: spacing.md, paddingVertical: spacing.sm - 2, gap: spacing.sm }]}>
      <Avatar name={avatarName} size={32} />
      <View accessible accessibilityLabel={`${author}, ${time}. ${body}`} style={[styles.text, !onDelete && { paddingRight: spacing.md }]}>
        <View style={[styles.byline, { gap: spacing.xs }]}>
          <AppText variant="subheadStrong" style={styles.shrink}>
            {author}
          </AppText>
          <AppText variant="footnote" color="labelSecondary">
            {time}
          </AppText>
        </View>
        <AppText variant="body" selectable>
          {body}
        </AppText>
      </View>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${kind} from ${author}`}
          accessibilityHint="Asks before deleting it for everyone"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.delete,
            { minWidth: layout.minTarget, minHeight: layout.minTarget },
            pressed && { opacity: motion.pressedOpacity },
          ]}
        >
          <Icon name="trash-outline" size={20} color="danger" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  byline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  shrink: { flexShrink: 1 },
  delete: { alignItems: 'center', justifyContent: 'center' },
});
