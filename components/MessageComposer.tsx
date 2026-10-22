import { Control } from 'react-hook-form';
import { MESSAGE_MAX, MessageFormValues } from '../models/MessageForm';
import { Button } from './Button';
import { ControlledTextField } from './ControlledTextField';
import { InlineBanner } from './InlineBanner';

interface MessageComposerProps {
  control: Control<MessageFormValues, unknown, string>;
  /** Spoken and shown above the box, e.g. "New announcement". */
  label: string;
  placeholder: string;
  /** The button's text, e.g. "Post Announcement". */
  sendLabel: string;
  onSend: () => void;
  sending: boolean;
  error: string | null;
  /** Why posting isn't possible right now (offline), shown instead of letting the request fail. */
  disabledReason?: string | null;
}

/** A text box and a Post button, for the footer of a message sheet (kept above the keyboard by Sheet). */
export function MessageComposer({
  control,
  label,
  placeholder,
  sendLabel,
  onSend,
  sending,
  error,
  disabledReason,
}: MessageComposerProps) {
  return (
    <>
      {error ? <InlineBanner tone="error" message={error} /> : null}
      {disabledReason ? <InlineBanner tone="offline" message={disabledReason} /> : null}
      <ControlledTextField
        control={control}
        name="body"
        label={label}
        placeholder={placeholder}
        helper={`Up to ${MESSAGE_MAX} characters.`}
        multiline
        autoCapitalize="sentences"
      />
      <Button label={sendLabel} icon="send" onPress={onSend} loading={sending} disabled={!!disabledReason} />
    </>
  );
}
