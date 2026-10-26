import { tripCountdown } from '../tripProgress';

describe('tripCountdown', () => {
  it('counts days until the trip', () => {
    expect(tripCountdown('2026-12-10', '2026-12-14', '2026-10-25')).toEqual({ figure: '46', caption: 'days to go' });
    expect(tripCountdown('2026-12-10', '2026-12-14', '2026-12-09')).toEqual({ figure: '1', caption: 'day to go' });
  });
  it('shows which day it is during the trip', () => {
    expect(tripCountdown('2026-12-10', '2026-12-14', '2026-12-10')).toEqual({ figure: 'Day 1', caption: 'of 5' });
    expect(tripCountdown('2026-12-10', '2026-12-14', '2026-12-14')).toEqual({ figure: 'Day 5', caption: 'of 5' });
  });
  it('says so when the trip is over', () => {
    expect(tripCountdown('2026-12-10', '2026-12-14', '2026-12-15')).toEqual({ figure: 'Done', caption: 'trip complete' });
  });
});
