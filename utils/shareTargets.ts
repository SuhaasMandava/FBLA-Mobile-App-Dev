/** Apps TripHub can send a message to directly, without the system share sheet. */
export type ShareTarget = 'whatsapp' | 'sms' | 'x';

export const SHARE_TARGET_NAMES: Record<ShareTarget, string> = {
  whatsapp: 'WhatsApp',
  sms: 'Messages',
  x: 'X',
};

/**
 * The URLs that open `target` with `text` ready to send, in the order to try them.
 * The app's own link comes first; for WhatsApp and X a web link follows, which opens the
 * app if it's installed (or the website, which offers it) when the first one can't be opened.
 * Text messages have no web fallback. iOS reads the body after `&`, Android after `?`.
 */
export function shareTargetUrls(target: ShareTarget, text: string, platform: string): string[] {
  const body = encodeURIComponent(text);
  switch (target) {
    case 'whatsapp':
      return [`whatsapp://send?text=${body}`, `https://wa.me/?text=${body}`];
    case 'sms':
      return [platform === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`];
    case 'x':
      return [`twitter://post?message=${body}`, `https://twitter.com/intent/tweet?text=${body}`];
  }
}

/** What to tell the person when none of the URLs could be opened. */
export function shareTargetUnavailableMessage(target: ShareTarget): string {
  return target === 'sms'
    ? "This device can't send text messages. Use Share Invite Code to pick another app."
    : `Couldn't open ${SHARE_TARGET_NAMES[target]}. Use Share Invite Code to pick another app.`;
}
