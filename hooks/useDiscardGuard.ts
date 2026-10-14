import { NavigationAction, useNavigation, usePreventRemove } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Control, FieldValues, useFormState } from 'react-hook-form';
import { confirmDestructive } from '../utils/confirm';

/**
 * Asks before a form sheet with unsaved changes is closed (Cancel, swipe down, or Android back).
 * Returns `leave`, which closes the sheet without asking: call it once the form has saved.
 */
export function useDiscardGuard<T extends FieldValues, Data>(
  control: Control<T, unknown, Data>,
  leaveAction: () => void,
) {
  const navigation = useNavigation();
  const { isDirty } = useFormState({ control });
  const [leaving, setLeaving] = useState(false);
  const leaveRef = useRef(leaveAction);
  useEffect(() => {
    leaveRef.current = leaveAction;
  });

  usePreventRemove(isDirty && !leaving, ({ data }: { data: { action: NavigationAction } }) => {
    confirmDestructive({
      title: 'Discard changes?',
      message: "What you've entered won't be saved.",
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing',
      onConfirm: () => navigation.dispatch(data.action),
    });
  });

  // Leave after the render that lifts the guard, so the navigation isn't blocked.
  useEffect(() => {
    if (leaving) leaveRef.current();
  }, [leaving]);

  return useCallback(() => setLeaving(true), []);
}
