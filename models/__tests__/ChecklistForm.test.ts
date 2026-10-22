import {
  CHECKLIST_TITLE_MAX,
  checklistItemToFormValues,
  ChecklistFormValues,
  emptyChecklistForm,
  validateChecklistForm,
} from '../ChecklistForm';
import { ChecklistItem } from '../ChecklistModel';

const context = { memberIds: ['sam', 'alex'] };

const valid = (overrides: Partial<ChecklistFormValues> = {}): ChecklistFormValues => ({
  ...emptyChecklistForm(),
  title: 'Passports',
  ...overrides,
});

function errorsOf(values: ChecklistFormValues) {
  const result = validateChecklistForm(values, context);
  if (result.ok) throw new Error('expected the form to be rejected');
  return result.errors;
}

function dataOf(values: ChecklistFormValues) {
  const result = validateChecklistForm(values, context);
  if (!result.ok) throw new Error(`expected the form to pass: ${JSON.stringify(result.errors)}`);
  return result.data;
}

describe('validateChecklistForm: syntactic rules', () => {
  it('requires a name and trims it', () => {
    expect(errorsOf(valid({ title: '   ' })).title).toBe('Give the item a name.');
    expect(dataOf(valid({ title: '  Sunscreen  ' })).title).toBe('Sunscreen');
  });

  it('limits the name to 100 characters', () => {
    expect(errorsOf(valid({ title: 'x'.repeat(CHECKLIST_TITLE_MAX + 1) })).title).toMatch(/under 100/);
    expect(dataOf(valid({ title: 'x'.repeat(CHECKLIST_TITLE_MAX) })).title).toHaveLength(CHECKLIST_TITLE_MAX);
  });

  it('measures the limit after trimming', () => {
    expect(dataOf(valid({ title: ` ${'x'.repeat(CHECKLIST_TITLE_MAX)} ` })).title).toHaveLength(CHECKLIST_TITLE_MAX);
  });

  it('accepts only the known categories', () => {
    expect(dataOf(valid({ category: 'booking' })).category).toBe('booking');
    expect(errorsOf(valid({ category: 'snacks' as never })).category).toBe('Pick a category.');
  });
});

describe('validateChecklistForm: semantic rules', () => {
  it('treats no assignee as unassigned', () => {
    expect(dataOf(valid({ assignedTo: '' })).assignedTo).toBeNull();
  });

  it('accepts a member as the assignee', () => {
    expect(dataOf(valid({ assignedTo: 'alex' })).assignedTo).toBe('alex');
  });

  it('rejects an assignee who is not on the trip', () => {
    expect(errorsOf(valid({ assignedTo: 'stranger' })).assignedTo).toBe('That person is no longer on this trip.');
  });

  it('reports one message per field and keeps every failing field', () => {
    const errors = errorsOf(valid({ title: '', assignedTo: 'stranger' }));
    expect(Object.keys(errors).sort()).toEqual(['assignedTo', 'title']);
  });
});

describe('form values for an existing item', () => {
  const item: ChecklistItem = {
    id: '1',
    tripId: 't',
    title: 'Book the ferry',
    category: 'booking',
    assignedTo: 'alex',
    done: false,
    completedBy: null,
    completedAt: null,
    createdBy: 'sam',
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('fills the form from the item', () => {
    expect(checklistItemToFormValues(item, context.memberIds)).toEqual({
      title: 'Book the ferry',
      category: 'booking',
      assignedTo: 'alex',
    });
  });

  it('treats an assignee who left the trip as unassigned, so the form can still be saved', () => {
    const values = checklistItemToFormValues({ ...item, assignedTo: 'gone' }, context.memberIds);
    expect(values.assignedTo).toBe('');
    expect(validateChecklistForm(values, context).ok).toBe(true);
  });
});
