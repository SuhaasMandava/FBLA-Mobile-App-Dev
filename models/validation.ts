import { z } from 'zod';

/** One message per field, keyed by field name. */
export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/** Result of validating a form: the cleaned data, or what to show under each field. */
export type Validation<T, Data> = { ok: true; data: Data } | { ok: false; errors: FieldErrors<T> };

/** Keep only the first zod issue per top-level field, so each input shows a single message. */
export function firstIssuePerField<T>(error: z.ZodError): FieldErrors<T> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) errors[field] = issue.message;
  }
  return errors as FieldErrors<T>;
}
