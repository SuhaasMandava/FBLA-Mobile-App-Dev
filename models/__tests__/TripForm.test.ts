import {
  CreateTripFormValues,
  tripToFormValues,
  validateCreateTripForm,
  validateEditTripForm,
  validateJoinTripForm,
} from '../TripForm';
import { Trip } from '../TripModel';

const TODAY = '2026-10-20';

const values = (overrides: Partial<CreateTripFormValues> = {}): CreateTripFormValues => ({
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-11-01',
  endDate: '2026-11-07',
  budget: '1500',
  ...overrides,
});

const saved: Trip = {
  id: 't',
  name: 'Beach week',
  destination: 'Maui',
  startDate: '2026-10-15', // already under way on TODAY
  endDate: '2026-10-25',
  budgetCents: 150050,
  inviteCode: 'K7M9PQ',
  members: [],
};

function errorsOf(result: ReturnType<typeof validateCreateTripForm>) {
  if (result.ok) throw new Error('expected the form to be rejected');
  return result.errors;
}

describe('validateCreateTripForm', () => {
  it('returns the trip with the budget in integer cents', () => {
    expect(validateCreateTripForm(values({ budget: '$1,500.50' }), TODAY)).toEqual({
      ok: true,
      data: {
        name: 'Beach week',
        destination: 'Maui',
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        budgetCents: 150050,
      },
    });
  });

  it('checks each field', () => {
    expect(errorsOf(validateCreateTripForm(values({ name: 'ab' }), TODAY)).name).toMatch(/at least 3/);
    expect(errorsOf(validateCreateTripForm(values({ destination: ' ' }), TODAY)).destination).toBe(
      'Destination is required.',
    );
    expect(errorsOf(validateCreateTripForm(values({ budget: '0' }), TODAY)).budget).toBe('Budget must be greater than $0.');
    expect(errorsOf(validateCreateTripForm(values({ budget: '12.345' }), TODAY)).budget).toMatch(/amount like/);
  });

  it('refuses a start date in the past and an end before the start', () => {
    expect(errorsOf(validateCreateTripForm(values({ startDate: '2026-10-19' }), TODAY)).startDate).toBe(
      "Start date can't be in the past.",
    );
    expect(errorsOf(validateCreateTripForm(values({ endDate: '2026-10-31' }), TODAY)).endDate).toBe(
      "End date can't be before the start date.",
    );
  });
});

describe('tripToFormValues', () => {
  it('fills the form from a saved trip, budget in dollars', () => {
    expect(tripToFormValues(saved)).toEqual({
      name: 'Beach week',
      destination: 'Maui',
      startDate: '2026-10-15',
      endDate: '2026-10-25',
      budget: '1500.50',
    });
    expect(tripToFormValues({ ...saved, budgetCents: 200000 }).budget).toBe('2000');
    expect(tripToFormValues({ ...saved, budgetCents: 0 }).budget).toBe('');
  });

  it('round-trips through validation unchanged', () => {
    const result = validateEditTripForm(tripToFormValues(saved), { original: saved, activityDays: [] }, TODAY);
    expect(result).toEqual({
      ok: true,
      data: {
        name: saved.name,
        destination: saved.destination,
        startDate: saved.startDate,
        endDate: saved.endDate,
        budgetCents: saved.budgetCents,
      },
    });
  });
});

describe('validateEditTripForm', () => {
  const edit = (overrides: Partial<CreateTripFormValues>, activityDays: string[] = []) =>
    validateEditTripForm({ ...tripToFormValues(saved), ...overrides }, { original: saved, activityDays }, TODAY);

  it('keeps a start date in the past if it is unchanged (the trip has begun)', () => {
    expect(edit({ name: 'Beach week 2026' }).ok).toBe(true);
  });

  it('refuses moving the start date to another day in the past', () => {
    expect(errorsOf(edit({ startDate: '2026-10-14' })).startDate).toBe("Start date can't be in the past.");
  });

  it('still refuses an end before the start', () => {
    expect(errorsOf(edit({ endDate: '2026-10-10' })).endDate).toBe("End date can't be before the start date.");
  });

  it('semantic rule: the dates must cover every planned activity', () => {
    const days = ['2026-10-16', '2026-10-24', '2026-10-25'];
    expect(edit({ endDate: '2026-10-23' }, days)).toEqual({
      ok: false,
      errors: { endDate: '2 activities are planned after this date. Move or delete them first.' },
    });
    expect(errorsOf(edit({ startDate: '2026-10-21', endDate: '2026-10-25' }, days)).startDate).toBe(
      '1 activity is planned before this date. Move or delete them first.',
    );
    expect(edit({ endDate: '2026-10-30' }, days).ok).toBe(true);
  });

  it('applies the same field rules as Create', () => {
    expect(errorsOf(edit({ name: '' })).name).toBe('Trip name is required.');
    expect(errorsOf(edit({ budget: '2000000' })).budget).toMatch(/can't exceed/);
  });
});

describe('validateJoinTripForm', () => {
  it('normalizes and checks the code shape', () => {
    expect(validateJoinTripForm({ code: 'k7m-9pq' })).toEqual({ ok: true, data: 'K7M9PQ' });
    expect(validateJoinTripForm({ code: '' })).toEqual({ ok: false, errors: { code: 'Enter an invite code.' } });
    expect(validateJoinTripForm({ code: 'ABC' }).ok).toBe(false);
  });
});
