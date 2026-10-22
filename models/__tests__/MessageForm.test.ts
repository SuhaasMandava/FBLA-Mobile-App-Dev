import { MESSAGE_MAX, validateAnnouncementForm, validateCommentForm } from '../MessageForm';

describe('validateAnnouncementForm', () => {
  const organizer = { isOrganizer: true };

  it('requires some text and trims it', () => {
    const empty = validateAnnouncementForm({ body: '  \n ' }, organizer);
    expect(empty).toEqual({ ok: false, errors: { body: 'Write the announcement first.' } });
    expect(validateAnnouncementForm({ body: '  Meet at 8  ' }, organizer)).toEqual({ ok: true, data: 'Meet at 8' });
  });

  it(`allows at most ${MESSAGE_MAX} characters`, () => {
    expect(validateAnnouncementForm({ body: 'x'.repeat(MESSAGE_MAX) }, organizer).ok).toBe(true);
    const tooLong = validateAnnouncementForm({ body: 'x'.repeat(MESSAGE_MAX + 1) }, organizer);
    expect(tooLong).toEqual({ ok: false, errors: { body: `Keep it under ${MESSAGE_MAX} characters.` } });
  });

  it('tidies line endings and long runs of blank lines', () => {
    const result = validateAnnouncementForm({ body: 'Line one\r\n\r\n\r\n\r\nLine two' }, organizer);
    expect(result).toEqual({ ok: true, data: 'Line one\n\nLine two' });
  });

  it('counts the tidied text, so blank lines pasted in do not push it over the limit', () => {
    const body = `${'x'.repeat(MESSAGE_MAX - 3)}\n\n\n\n\nx`; // exactly the limit once the blank lines shrink to one
    expect(validateAnnouncementForm({ body }, organizer).ok).toBe(true);
  });

  it('semantic rule: only an organizer can post', () => {
    expect(validateAnnouncementForm({ body: 'Meet at 8' }, { isOrganizer: false })).toEqual({
      ok: false,
      errors: { body: 'Only the trip organizer can post announcements.' },
    });
  });
});

describe('validateCommentForm', () => {
  it('requires some text', () => {
    expect(validateCommentForm({ body: '' }, { activityExists: true })).toEqual({
      ok: false,
      errors: { body: 'Write a comment first.' },
    });
  });

  it('returns the trimmed comment', () => {
    expect(validateCommentForm({ body: ' Bring water! ' }, { activityExists: true })).toEqual({
      ok: true,
      data: 'Bring water!',
    });
  });

  it('semantic rule: the activity must still be on the trip', () => {
    expect(validateCommentForm({ body: 'Bring water' }, { activityExists: false })).toEqual({
      ok: false,
      errors: { body: 'This activity was removed, so it can no longer get comments.' },
    });
  });
});
