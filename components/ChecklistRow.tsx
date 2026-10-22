import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ChecklistItem } from '../models/ChecklistModel';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface ChecklistRowProps {
  item: ChecklistItem;
  /** The line under the title: who it's assigned to and who finished it. */
  detail: string;
  onToggle: () => void;
  /** Opens the item to edit, reassign or delete it. */
  onEdit: () => void;
}

/**
 * One checklist item. The checkbox and the text are separate targets (each at least 44 pt):
 * the checkbox ticks it off, the text opens it. Done is shown by the filled check and the
 * struck-through title as well as the "Done by" words, never by color alone.
 */
export function ChecklistRow({ item, detail, onToggle, onEdit }: ChecklistRowProps) {
  const { spacing, layout, motion } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={item.title}
        accessibilityHint={item.done ? 'Marks it as not done' : 'Marks it as done'}
        accessibilityState={{ checked: item.done }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.checkbox,
          { minWidth: layout.minTarget, minHeight: layout.minTarget, paddingLeft: spacing.xs },
          pressed && { opacity: motion.pressedOpacity },
        ]}
      >
        <Icon
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.done ? 'accent' : 'labelSecondary'}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${detail}`}
        accessibilityHint="Opens the item to edit it"
        onPress={onEdit}
        style={({ pressed }) => [
          styles.body,
          { minHeight: layout.minTarget, paddingVertical: spacing.sm - 2, paddingRight: spacing.md, gap: spacing.xs },
          pressed && { opacity: motion.pressedOpacity },
        ]}
      >
        <View style={styles.text}>
          <AppText
            variant="body"
            color={item.done ? 'labelSecondary' : 'label'}
            style={item.done ? { textDecorationLine: 'line-through' } : undefined}
          >
            {item.title}
          </AppText>
          <AppText variant="subhead" color="labelSecondary">
            {detail}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={18} color="labelSecondary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  checkbox: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, gap: 2 },
});
