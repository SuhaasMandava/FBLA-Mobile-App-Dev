import { normalizeInviteCode } from './inviteCode';

/** The app's URL scheme, as set in app.json (`expo.scheme`). */
export const APP_SCHEME = 'triphub';

/** The link that opens TripHub's Join screen with this code filled in: triphub://join/K7M9PQ */
export function buildJoinLink(code: string): string {
  return `${APP_SCHEME}://join/${normalizeInviteCode(code)}`;
}

/** The shape the Join form and the database accept (002_trip_constraints.sql). */
const VALID_CODE = /^[A-Z0-9]{6}$/;

/**
 * The invite code in a join link, or null if the URL isn't one. Accepts the app's own
 * links (triphub://join/K7M9PQ, triphub:///join/k7m9pq) and the form Expo Go uses while
 * developing (exp://192.168.1.5:8081/--/join/K7M9PQ). Codes are normalized and must have
 * the shape of an invite code, so a mangled link is ignored rather than prefilled.
 */
export function parseJoinLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(url.trim());
  if (!match) return null;
  const [, scheme, rest] = match;
  const withoutQuery = rest.split(/[?#]/)[0];

  let path: string;
  if (scheme.toLowerCase() === APP_SCHEME) {
    path = withoutQuery; // triphub://join/CODE: "join" is the host, so everything after :// is the route
  } else if (/^exps?$/i.test(scheme)) {
    const marker = withoutQuery.indexOf('/--/'); // Expo Go puts the app's route after /--/
    if (marker < 0) return null;
    path = withoutQuery.slice(marker + 4);
  } else {
    return null;
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0].toLowerCase() !== 'join') return null;
  let code: string;
  try {
    code = normalizeInviteCode(decodeURIComponent(segments[1]));
  } catch {
    return null; // malformed percent-encoding
  }
  return VALID_CODE.test(code) ? code : null;
}
