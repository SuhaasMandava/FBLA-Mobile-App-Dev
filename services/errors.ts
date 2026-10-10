/** An error whose message is safe and meant to be shown to the user as-is. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export type TripServiceErrorCode = 'invite_not_found' | 'already_member' | 'invite_generation_failed';

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

/** Message to show the user. Unexpected errors (network, database) get a generic one; log the real error separately. */
export function getErrorMessage(error: unknown): string {
  return error instanceof UserFacingError ? error.message : GENERIC_MESSAGE;
}
