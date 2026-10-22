import { Linking, Platform, Share } from 'react-native';
import { Trip, TripModel } from '../models/TripModel';
import { ShareTarget, shareTargetUnavailableMessage, shareTargetUrls } from '../utils/shareTargets';
import { UserFacingError } from './errors';

/**
 * Open each URL in turn until one works. Doesn't ask `canOpenURL` first: that needs every
 * scheme declared in the app's config on iOS and Android, while trying the link and
 * falling back when it's refused works everywhere.
 */
async function openFirstAvailable(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Not installed, or nothing on the device handles this kind of link: try the next one.
    }
  }
  return false;
}

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

  /** Send the trip's invite straight to WhatsApp or a text message. */
  async sendInvite(trip: Trip, target: Exclude<ShareTarget, 'x'>): Promise<void> {
    const message = TripModel.inviteMessage(trip);
    if (!message) throw new UserFacingError("This trip doesn't have an invite code to share.");
    if (!(await openFirstAvailable(shareTargetUrls(target, message, Platform.OS)))) {
      throw new UserFacingError(shareTargetUnavailableMessage(target));
    }
  },

  /** Start a public post about the trip on X. It never includes the invite code. */
  async postToX(trip: Trip): Promise<void> {
    if (!(await openFirstAvailable(shareTargetUrls('x', TripModel.socialPost(trip), Platform.OS)))) {
      throw new UserFacingError(shareTargetUnavailableMessage('x'));
    }
  },
};
