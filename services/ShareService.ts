import { Share } from 'react-native';
import { Trip, TripModel } from '../models/TripModel';
import { UserFacingError } from './errors';

export const ShareService = {
  /** Open the system share sheet with the trip's invite message. Resolves quietly if the user just closes the sheet. */
  async shareInvite(trip: Trip): Promise<void> {
    const message = TripModel.inviteMessage(trip);
    if (!message) throw new UserFacingError("This trip doesn't have an invite code to share.");
    try {
      await Share.share({ message });
    } catch (e) {
      console.error('Sharing invite failed', e);
      throw new UserFacingError("Couldn't open the share sheet. Try again.");
    }
  },
};
