import { passwordMatch, validateDisplayNameForm, validateSignUpForm } from '../AuthForm';

describe('passwordMatch', () => {
  it('says nothing until the confirm box has something in it', () => {
    expect(passwordMatch('hunter22', '')).toBe('empty');
  });

  it('waits while the confirm box could still become the password', () => {
    expect(passwordMatch('hunter22', 'h')).toBe('typing');
    expect(passwordMatch('hunter22', 'hunter2')).toBe('typing');
  });

  it('reports a match only when the two are identical', () => {
    expect(passwordMatch('hunter22', 'hunter22')).toBe('match');
  });

  it('reports a mismatch as soon as the confirm box can no longer match', () => {
    expect(passwordMatch('hunter22', 'hx')).toBe('mismatch');
    expect(passwordMatch('hunter22', 'hunter222')).toBe('mismatch');
    expect(passwordMatch('hunter22', 'Hunter22')).toBe('mismatch'); // case matters
    expect(passwordMatch('hunter22', 'hunter22 ')).toBe('mismatch'); // so do spaces
  });

  it('agrees with the rule checked on submit', () => {
    const base = { displayName: 'Alex', email: 'alex@example.com', password: 'hunter22' };
    expect(validateSignUpForm({ ...base, confirmPassword: 'hunter22' }).ok).toBe(true);
    const result = validateSignUpForm({ ...base, confirmPassword: 'hunter23' });
    expect(result.ok ? null : result.errors.confirmPassword).toBe("Passwords don't match.");
  });
});

describe('validateDisplayNameForm', () => {
  it('trims the name', () => {
    expect(validateDisplayNameForm({ displayName: '  Sam  ' })).toEqual({ ok: true, data: 'Sam' });
  });

  it('refuses a blank, one-letter or very long name', () => {
    expect(validateDisplayNameForm({ displayName: '   ' })).toMatchObject({ ok: false });
    expect(validateDisplayNameForm({ displayName: 'S' })).toMatchObject({ ok: false });
    expect(validateDisplayNameForm({ displayName: 'x'.repeat(41) })).toMatchObject({ ok: false });
  });
});
