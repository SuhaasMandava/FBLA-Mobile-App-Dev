import { z } from 'zod';
import { firstIssuePerField, Validation } from './validation';

export interface SignInValues {
  email: string;
  password: string;
}

export interface SignUpValues {
  displayName: string;
  email: string;
  password: string;
}

export const EMPTY_SIGN_IN: SignInValues = { email: '', password: '' };
export const EMPTY_SIGN_UP: SignUpValues = { displayName: '', email: '', password: '' };

const email = z.string().min(1, 'Email is required.').pipe(z.email('Enter a valid email address.'));

const signInSchema = z.object({
  email,
  // Sign-in only checks it was entered; the strength rules apply when choosing a password.
  password: z.string().min(1, 'Password is required.'),
});

const signUpSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Your name is required.')
    .min(2, 'Your name must be at least 2 characters.')
    .max(40, 'Keep your name under 40 characters.'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be 72 characters or fewer.')
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must include a letter and a number.'),
});

/** Emails are case-insensitive; names and emails ignore stray spaces. Passwords are left exactly as typed. */
const clean = <T extends { email: string }>(values: T): T => ({ ...values, email: values.email.trim().toLowerCase() });

export function validateSignInForm(values: SignInValues): Validation<SignInValues, SignInValues> {
  const result = signInSchema.safeParse(clean(values));
  return result.success ? { ok: true, data: result.data } : { ok: false, errors: firstIssuePerField(result.error) };
}

export function validateSignUpForm(values: SignUpValues): Validation<SignUpValues, SignUpValues> {
  const result = signUpSchema.safeParse(clean({ ...values, displayName: values.displayName.trim() }));
  return result.success ? { ok: true, data: result.data } : { ok: false, errors: firstIssuePerField(result.error) };
}
