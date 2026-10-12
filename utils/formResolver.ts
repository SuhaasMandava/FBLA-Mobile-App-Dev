import { FieldErrors as RhfFieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { Validation } from '../models/validation';

/**
 * Plug one of our zod-backed validate functions into react-hook-form: the
 * rules stay in models/ (testable without React), and react-hook-form just
 * manages field state and shows the messages. On success, handleSubmit
 * receives the validator's cleaned `data` (trimmed, converted), not the raw text.
 */
export function createResolver<T extends FieldValues, Data = T>(
  validate: (values: T) => Validation<T, Data>,
): Resolver<T, unknown, Data> {
  return async (values) => {
    const result = validate(values);
    if (result.ok) return { values: result.data, errors: {} };

    const errors: Record<string, { type: string; message: string }> = {};
    for (const [field, message] of Object.entries(result.errors)) {
      if (typeof message === 'string') errors[field] = { type: 'validate', message };
    }
    return { values: {}, errors: errors as RhfFieldErrors<T> };
  };
}
