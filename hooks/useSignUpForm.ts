import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { EMPTY_SIGN_UP, SignUpValues, validateSignUpForm } from '../models/AuthForm';
import { AuthService } from '../services/AuthService';
import { getErrorMessage } from '../services/errors';
import { createResolver } from '../utils/formResolver';

/** Form state and submit logic for creating an account. */
export function useSignUpForm() {
  const form = useForm<SignUpValues, unknown, SignUpValues>({
    defaultValues: EMPTY_SIGN_UP,
    resolver: createResolver(validateSignUpForm),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Set when the project requires email confirmation, so there's no session yet. */
  const [notice, setNotice] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setNotice(null);
    try {
      const outcome = await AuthService.signUp(values);
      if (outcome === 'confirmation_required') {
        const message = 'Check your email for a confirmation link, then come back and sign in.';
        setNotice(message);
        AccessibilityInfo.announceForAccessibility(message);
      }
      // Otherwise a session exists and the auth listener moves the app on.
    } catch (e) {
      const message = getErrorMessage(e);
      setSubmitError(message);
      AccessibilityInfo.announceForAccessibility(message);
    }
  });

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError, notice };
}
