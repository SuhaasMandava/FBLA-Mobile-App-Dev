import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { MutationResult } from '../context/ItineraryContext';
import { EMPTY_MESSAGE_FORM, MessageFormValues } from '../models/MessageForm';
import { Validation } from '../models/validation';
import { createResolver } from '../utils/formResolver';

interface Options {
  /** Checks the text (see models/MessageForm.ts) and returns it cleaned up. */
  validate: (values: MessageFormValues) => Validation<MessageFormValues, string>;
  /** Posts the cleaned-up text. */
  send: (body: string) => Promise<MutationResult>;
  /** Spoken once the message is posted, e.g. "Comment posted". */
  sentAnnouncement: string;
}

/** State and submit logic for a message composer (announcement or comment). Clears itself once the message is posted. */
export function useMessageForm({ validate, send, sentAnnouncement }: Options) {
  const form = useForm<MessageFormValues, unknown, string>({
    defaultValues: EMPTY_MESSAGE_FORM,
    resolver: createResolver(validate),
    reValidateMode: 'onSubmit',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = form.handleSubmit(
    async (body) => {
      setSubmitError(null);
      const result = await send(body);
      if (result.ok) {
        form.reset(EMPTY_MESSAGE_FORM);
        AccessibilityInfo.announceForAccessibility(sentAnnouncement);
      } else {
        setSubmitError(result.error);
        AccessibilityInfo.announceForAccessibility(result.error);
      }
    },
    (errors) => {
      const message = errors.body?.message;
      if (message) AccessibilityInfo.announceForAccessibility(message);
    },
  );

  return { control: form.control, submit, submitting: form.formState.isSubmitting, submitError };
}
