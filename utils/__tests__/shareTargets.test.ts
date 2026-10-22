import { shareTargetUnavailableMessage, shareTargetUrls } from '../shareTargets';

const text = 'Join "Beach week" & bring sunscreen: triphub://join/K7M9PQ';
const encoded = encodeURIComponent(text);

describe('shareTargetUrls', () => {
  it('tries the WhatsApp app, then wa.me (which opens the app or offers it)', () => {
    expect(shareTargetUrls('whatsapp', text, 'ios')).toEqual([
      `whatsapp://send?text=${encoded}`,
      `https://wa.me/?text=${encoded}`,
    ]);
  });

  it('writes the text-message body the way each platform reads it', () => {
    expect(shareTargetUrls('sms', text, 'ios')).toEqual([`sms:&body=${encoded}`]);
    expect(shareTargetUrls('sms', text, 'android')).toEqual([`sms:?body=${encoded}`]);
  });

  it('tries the X app, then the web post page', () => {
    expect(shareTargetUrls('x', text, 'android')).toEqual([
      `twitter://post?message=${encoded}`,
      `https://twitter.com/intent/tweet?text=${encoded}`,
    ]);
  });

  it('encodes characters that would otherwise break the URL', () => {
    const [url] = shareTargetUrls('whatsapp', 'a&b=c #d', 'ios');
    expect(url).toBe('whatsapp://send?text=a%26b%3Dc%20%23d');
  });
});

describe('shareTargetUnavailableMessage', () => {
  it('points to the share sheet instead', () => {
    expect(shareTargetUnavailableMessage('sms')).toMatch(/can't send text messages/);
    expect(shareTargetUnavailableMessage('whatsapp')).toBe(
      "Couldn't open WhatsApp. Use Share Invite Code to pick another app.",
    );
  });
});
