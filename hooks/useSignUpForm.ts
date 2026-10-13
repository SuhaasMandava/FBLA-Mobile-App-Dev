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

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await AuthService.signUp(values); // signed in right away; the auth listener moves the app on
    } catch (e) {
      const message = getErrorMessage(e);
      setSubmitError(message);
      AccessibilityInfo.announceForAccessibility(message);
    }
  });

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError };
}
