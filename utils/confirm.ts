import { ActionSheetIOS, Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the destructive button, e.g. "Delete Activity". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Label of the safe choice. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Draw the confirm button in red. Defaults to true; turn off for weighty but non-destructive choices. */
  destructive?: boolean;
}

/**
 * Confirms a destructive choice the system way on each platform: an action sheet on
 * iOS (HIG, Alerts › Mobile: "Use an action sheet — not an alert — to offer choices
 * related to an intentional action"), a Material dialog on Android.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancel',
  destructive = true,
}: ConfirmOptions) {
  // react-native-web's Alert does nothing, so the browser's own dialog stands in (web is only used for testing).
  if (Platform.OS === 'web') {
    if (window.confirm([title, message].filter(Boolean).join('\n\n'))) onConfirm();
    return;
  }
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [confirmLabel, cancelLabel],
        destructiveButtonIndex: destructive ? 0 : undefined,
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
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

interface ActionChoice {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * Offers a short menu of actions about one thing (e.g. a trip member): an action sheet on iOS,
 * a dialog on Android. At most two actions, since Android dialogs hold three buttons with Cancel.
 * Choosing an action doesn't do anything irreversible by itself; destructive ones confirm next.
 */
export function chooseAction({ title, message, actions }: { title: string; message?: string; actions: ActionChoice[] }) {
  const shown = actions.slice(0, 2);
  if (Platform.OS === 'web') {
    const chosen = shown.find((a) => window.confirm(`${[title, message].filter(Boolean).join('\n\n')}\n\n${a.label}?`));
    chosen?.onPress();
    return;
  }
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...shown.map((a) => a.label), 'Cancel'],
        destructiveButtonIndex: shown.flatMap((a, i) => (a.destructive ? [i] : [])),
        cancelButtonIndex: shown.length,
      },
      (index) => shown[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    ...shown.map((a) => ({ text: a.label, style: a.destructive ? ('destructive' as const) : ('default' as const), onPress: a.onPress })),
  ]);
}
