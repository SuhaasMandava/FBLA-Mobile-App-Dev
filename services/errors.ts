/** An error whose message is safe and meant to be shown to the user as-is. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export type TripServiceErrorCode =
  | 'invite_not_found'
  | 'already_member'
  | 'invite_generation_failed'
  | 'trip_not_found'
  | 'item_not_found'
  | 'not_permitted'
  | 'day_outside_trip'
  | 'expense_not_found'
  | 'invalid_split'
  | 'checklist_item_not_found'
  | 'invalid_assignee';

export class TripServiceError extends UserFacingError {
  constructor(
    public readonly code: TripServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TripServiceError';
  }
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const OFFLINE_MESSAGE = "You appear to be offline. Check your connection and try again.";

/** Does this look like the request never reached the server? (fetch fails with a different message per platform) */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : '';
  return /network request failed|failed to fetch|network error|load failed/i.test(message);
}

/** Message to show the user. Unexpected errors (database) get a generic one; log the real error separately. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  return isNetworkError(error) ? OFFLINE_MESSAGE : GENERIC_MESSAGE;
}
