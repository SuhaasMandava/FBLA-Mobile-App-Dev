import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

interface HeaderButtonProps {
  onPress: () => void;
  /** Visible text (e.g. "Cancel", "Edit"). Leave out for an icon-only button. */
  label?: string;
  icon?: IconName;
  /** Spoken label; required when there's no visible text. */
  accessibilityLabel?: string;
  /** Heavier text, for the confirming action (e.g. "Done"). */
  prominent?: boolean;
}

/** A button in a navigation bar. 44 x 44 pt at minimum, labeled for screen readers. */
export function HeaderButton({ onPress, label, icon, accessibilityLabel, prominent = false }: HeaderButtonProps) {
  const { layout, motion } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { minWidth: layout.minTarget, minHeight: layout.minTarget },
        pressed && { opacity: motion.pressedOpacity },
      ]}
    >
      {icon ? <Icon name={icon} size={24} color="accent" fixedSize /> : null}
      {label ? (
        // Bars have a fixed height, so their text grows only so far.
        <AppText variant={prominent ? 'headline' : 'body'} color="accent" maxFontSizeMultiplier={1.4}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
});
