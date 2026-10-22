import { buildJoinLink, parseJoinLink } from '../inviteLink';

describe('buildJoinLink', () => {
  it('builds the app link with a normalized code', () => {
    expect(buildJoinLink('K7M9PQ')).toBe('triphub://join/K7M9PQ');
    expect(buildJoinLink('k7m-9pq')).toBe('triphub://join/K7M9PQ');
  });

  it('round-trips through parseJoinLink', () => {
    expect(parseJoinLink(buildJoinLink('abc234'))).toBe('ABC234');
  });
});

describe('parseJoinLink', () => {
  it.each([
    ['triphub://join/K7M9PQ', 'K7M9PQ'],
    ['triphub://join/k7m9pq', 'K7M9PQ'],
    ['triphub:///join/K7M9PQ', 'K7M9PQ'],
    ['TripHub://Join/K7M9PQ/', 'K7M9PQ'],
    ['triphub://join/K7M9PQ?utm_source=sms', 'K7M9PQ'],
    ['triphub://join/K7M-9PQ', 'K7M9PQ'],
    ['triphub://join/K7M%209PQ', 'K7M9PQ'],
    ['  triphub://join/K7M9PQ  ', 'K7M9PQ'],
    // Expo Go while developing
    ['exp://192.168.1.5:8081/--/join/K7M9PQ', 'K7M9PQ'],
    ['exps://u.expo.dev/abc/--/join/k7m9pq', 'K7M9PQ'],
  ])('reads %s', (url, code) => {
    expect(parseJoinLink(url)).toBe(code);
  });

  it.each([
    null,
    undefined,
    '',
    'K7M9PQ',
    'triphub://',
    'triphub://join',
    'triphub://join/',
    'triphub://trips/K7M9PQ',
    'triphub://join/K7M9PQ/extra',
    'triphub://join/SHORT',
    'triphub://join/TOOLONG1',
    'triphub://join/K7M9P!',
    'triphub://join/%E0%A4%A',
    'exp://192.168.1.5:8081/join/K7M9PQ',
    'https://example.com/join/K7M9PQ',
    'otherapp://join/K7M9PQ',
  ])('ignores %p', (url) => {
    expect(parseJoinLink(url)).toBeNull();
  });
});
