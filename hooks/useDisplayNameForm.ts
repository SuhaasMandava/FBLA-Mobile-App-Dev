import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { DisplayNameValues, validateDisplayNameForm } from '../models/AuthForm';
import { AuthService } from '../services/AuthService';
import { getErrorMessage } from '../services/errors';
import { createResolver } from '../utils/formResolver';
import { useAuth } from './useAuth';
import { useTrip } from './useTrip';

/** Form state and submit logic for the Your Name screen. `onSaved` runs once the new name is stored. */
export function useDisplayNameForm(currentName: string, onSaved: () => void) {
  const { userId } = useAuth();
  const { refresh } = useTrip();
  const form = useForm<DisplayNameValues, unknown, string>({
    defaultValues: { displayName: currentName },
    resolver: createResolver(validateDisplayNameForm),
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(
    async (displayName) => {
      if (!userId) return;
      try {
        await AuthService.updateDisplayName(userId, displayName);
        await refresh(); // member lists carry the name, so reload them
        onSaved();
      } catch (e) {
        console.error('Saving name failed', e);
        const message = getErrorMessage(e);
        form.setError('displayName', { type: 'server', message });
        AccessibilityInfo.announceForAccessibility(message);
      }
    },
    (errors) => {
      const message = errors.displayName?.message;
      if (message) AccessibilityInfo.announceForAccessibility(message);
    },
  );

  return { control: form.control, submit, submitting: form.formState.isSubmitting };
}
