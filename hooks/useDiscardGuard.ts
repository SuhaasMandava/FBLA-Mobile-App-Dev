import { NavigationAction, useNavigation, usePreventRemove } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Control, FieldValues, useFormState } from 'react-hook-form';
import { confirmDestructive } from '../utils/confirm';

/**
 * Asks before a form sheet with unsaved changes is closed (Cancel, swipe down, or Android back).
 * Once `done` turns true (the form saved), the guard lifts and `leave` runs to close the sheet.
 */
export function useDiscardGuard<T extends FieldValues, Data>(
  control: Control<T, unknown, Data>,
  done: boolean,
  leave: () => void,
) {
  const navigation = useNavigation();
  const { isDirty } = useFormState({ control });
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });

  usePreventRemove(isDirty && !done, ({ data }: { data: { action: NavigationAction } }) => {
    confirmDestructive({
      title: 'Discard changes?',
      message: "What you've entered won't be saved.",
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing',
      onConfirm: () => navigation.dispatch(data.action),
    });
  });

  // Leave after the render that lifted the guard, so the navigation isn't blocked.
  useEffect(() => {
    if (done) leaveRef.current();
  }, [done]);
}
