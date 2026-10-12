import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { EMPTY_SIGN_IN, SignInValues, validateSignInForm } from '../models/AuthForm';
import { AuthService } from '../services/AuthService';
import { getErrorMessage } from '../services/errors';
import { createResolver } from '../utils/formResolver';

/** Form state and submit logic for signing in. */
export function useSignInForm() {
  const form = useForm<SignInValues, unknown, SignInValues>({
    defaultValues: EMPTY_SIGN_IN,
    resolver: createResolver(validateSignInForm),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await AuthService.signIn(values); // the auth listener moves the app on when this succeeds
    } catch (e) {
      const message = getErrorMessage(e);
      setSubmitError(message);
      AccessibilityInfo.announceForAccessibility(message);
    }
  });

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError };
}
