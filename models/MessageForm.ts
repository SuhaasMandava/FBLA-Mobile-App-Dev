import { z } from 'zod';
import { firstIssuePerField, Validation } from './validation';

/** Longest announcement or comment, in characters (the database checks the same). */
export const MESSAGE_MAX = 500;

/** Raw value of a message composer. */
export interface MessageFormValues {
  body: string;
}

export const EMPTY_MESSAGE_FORM: MessageFormValues = { body: '' };

/** Line endings from any keyboard become "\n", and runs of blank lines shrink to one. */
function tidy(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
}

/** Syntactic rules shared by both kinds of message: some text, and not too much of it. */
const bodySchema = (emptyMessage: string) =>
  z
    .string()
    .transform(tidy)
    .pipe(
      z
        .string()
        .trim()
        .min(1, emptyMessage)
        .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`),
    );

export interface AnnouncementFormContext {
  /** Semantic rule: only an organizer can post to the whole group. */
  isOrganizer: boolean;
}

/** Validate an announcement and, if it passes, return the text to post. */
export function validateAnnouncementForm(
  values: MessageFormValues,
  { isOrganizer }: AnnouncementFormContext,
): Validation<MessageFormValues, string> {
  const schema = z.object({
    body: bodySchema('Write the announcement first.').refine(() => isOrganizer, {
      message: 'Only the trip organizer can post announcements.',
    }),
  });
  const result = schema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  return { ok: true, data: result.data.body };
}

export interface CommentFormContext {
  /** Semantic rule: the activity must still be on the trip (someone may have deleted it meanwhile). */
  activityExists: boolean;
}

/** Validate a comment and, if it passes, return the text to post. */
export function validateCommentForm(
  values: MessageFormValues,
  { activityExists }: CommentFormContext,
): Validation<MessageFormValues, string> {
  const schema = z.object({
    body: bodySchema('Write a comment first.').refine(() => activityExists, {
      message: 'This activity was removed, so it can no longer get comments.',
    }),
  });
  const result = schema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  return { ok: true, data: result.data.body };
}
