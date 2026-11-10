import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** A light tap for selection changes (tabs, chips, toggles). Silent where the device has no haptics. */
export function tapFeedback(): void {
  if (!supported) return;
  Haptics.selectionAsync().catch(() => {});
}

/** A firmer tap for a screen's main action. */
export function pressFeedback(): void {
  if (!supported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirms that something was saved or finished. */
export function successFeedback(): void {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
