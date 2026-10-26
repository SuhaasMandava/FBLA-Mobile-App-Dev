import { z } from 'zod';
import { firstIssuePerField, Validation } from './validation';

export interface SignInValues {
  email: string;
  password: string;
}

/** What the Create Account form collects. `confirmPassword` only exists to catch typos. */
export interface SignUpValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** What actually gets sent to create the account. */
export type SignUpData = Omit<SignUpValues, 'confirmPassword'>;

export const EMPTY_SIGN_IN: SignInValues = { email: '', password: '' };
export const EMPTY_SIGN_UP: SignUpValues = { displayName: '', email: '', password: '', confirmPassword: '' };

export const PASSWORDS_DONT_MATCH = "Passwords don't match.";
export const PASSWORDS_MATCH = 'Passwords match.';

/**
 * Live feedback on the confirm box while it's being typed. `typing` while what's
 * there could still become the password (no red after the first keystroke);
 * `mismatch` once it can't, or it's as long as the password but different.
 */
export type PasswordMatch = 'empty' | 'typing' | 'match' | 'mismatch';

export function passwordMatch(password: string, confirmPassword: string): PasswordMatch {
  if (confirmPassword === '') return 'empty';
  if (confirmPassword === password) return 'match';
  return password.startsWith(confirmPassword) ? 'typing' : 'mismatch';
}

const email = z.string().min(1, 'Email is required.').pipe(z.email('Enter a valid email address.'));

const signInSchema = z.object({
  email,
  // Sign-in only checks it was entered; the strength rules apply when choosing a password.
  password: z.string().min(1, 'Password is required.'),
});

const displayNameSchema = z
  .string()
  .min(1, 'Your name is required.')
  .min(2, 'Your name must be at least 2 characters.')
  .max(40, 'Keep your name under 40 characters.');

const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    email,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be 72 characters or fewer.')
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must include a letter and a number.'),
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
  })
  // Compared exactly as typed, spaces included. Skipped while the box is empty so it shows "Re-enter" instead.
  .refine((v) => v.confirmPassword === '' || v.confirmPassword === v.password, {
    message: PASSWORDS_DONT_MATCH,
    path: ['confirmPassword'],
  });

/** Emails are case-insensitive; names and emails ignore stray spaces. Passwords are left exactly as typed. */
const clean = <T extends { email: string }>(values: T): T => ({ ...values, email: values.email.trim().toLowerCase() });

export function validateSignInForm(values: SignInValues): Validation<SignInValues, SignInValues> {
  const result = signInSchema.safeParse(clean(values));
  return result.success ? { ok: true, data: result.data } : { ok: false, errors: firstIssuePerField(result.error) };
}

export function validateSignUpForm(values: SignUpValues): Validation<SignUpValues, SignUpData> {
  const result = signUpSchema.safeParse(clean({ ...values, displayName: values.displayName.trim() }));
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  const { displayName, email: cleanEmail, password } = result.data;
  return { ok: true, data: { displayName, email: cleanEmail, password } };
}

export interface DisplayNameValues {
  displayName: string;
}

/** The Your Name screen: same rules as sign-up, with stray spaces ignored. */
export function validateDisplayNameForm(values: DisplayNameValues): Validation<DisplayNameValues, string> {
  const result = displayNameSchema.safeParse(values.displayName.trim());
  return result.success ? { ok: true, data: result.data } : { ok: false, errors: { displayName: result.error.issues[0].message } };
}
