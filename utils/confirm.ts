import { ActionSheetIOS, Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the destructive button, e.g. "Delete Activity". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Label of the safe choice. Defaults to "Cancel". */
  cancelLabel?: string;
}

/**
 * Confirms a destructive choice the system way on each platform: an action sheet on
 * iOS (HIG, Alerts › Mobile: "Use an action sheet — not an alert — to offer choices
 * related to an intentional action"), a Material dialog on Android.
 */
export function confirmDestructive({ title, message, confirmLabel, onConfirm, cancelLabel = 'Cancel' }: ConfirmOptions) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [confirmLabel, cancelLabel],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) onConfirm();
      },
    );
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
