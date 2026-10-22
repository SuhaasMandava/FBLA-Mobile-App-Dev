import { z } from 'zod';
import { CHECKLIST_CATEGORIES, ChecklistCategory, ChecklistItem, NewChecklistItem } from './ChecklistModel';
import { firstIssuePerField, Validation } from './validation';

export const CHECKLIST_TITLE_MAX = 100;

/** Raw values from the checklist form. `assignedTo` is a user id, or '' for nobody. */
export interface ChecklistFormValues {
  title: string;
  category: ChecklistCategory;
  assignedTo: string;
}

/** The current trip members. */
export interface ChecklistFormContext {
  memberIds: string[];
}

export function emptyChecklistForm(category: ChecklistCategory = 'packing'): ChecklistFormValues {
  return { title: '', category, assignedTo: '' };
}

/** The form as it was filled in for an existing item. Someone who left the trip counts as unassigned. */
export function checklistItemToFormValues(item: ChecklistItem, memberIds: string[]): ChecklistFormValues {
  return {
    title: item.title,
    category: item.category,
    assignedTo: item.assignedTo && memberIds.includes(item.assignedTo) ? item.assignedTo : '',
  };
}

/**
 * Syntactic rules live on the fields (required, length, a known category);
 * the semantic rule relates the assignee to the trip: they must be a member.
 */
function checklistSchema({ memberIds }: ChecklistFormContext) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Give the item a name.')
      .max(CHECKLIST_TITLE_MAX, `Keep the name under ${CHECKLIST_TITLE_MAX} characters.`),
    category: z.enum(CHECKLIST_CATEGORIES, 'Pick a category.'),
    assignedTo: z.string().refine((id) => id === '' || memberIds.includes(id), 'That person is no longer on this trip.'),
  });
}

/** Most items one quick-add can create (a pasted list), so a stray paste can't flood the list. */
export const QUICK_ADD_MAX_ITEMS = 25;

/**
 * Quick add: one item per line (so a pasted packing list becomes one item per line),
 * each with the same rules as the full form, all in `category` and unassigned. Bullets and
 * checkboxes people paste ("- ", "• ", "[ ] ") are dropped, and so are blank lines and repeats.
 */
export function validateQuickAdd(text: string, category: ChecklistCategory): Validation<{ text: string }, NewChecklistItem[]> {
  const titles = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim())
    .filter((line, index, all) => line.length > 0 && all.findIndex((l) => l.toLowerCase() === line.toLowerCase()) === index);
  if (titles.length === 0) return { ok: false, errors: { text: 'Type an item to add.' } };
  if (titles.length > QUICK_ADD_MAX_ITEMS) {
    return { ok: false, errors: { text: `Add up to ${QUICK_ADD_MAX_ITEMS} items at a time.` } };
  }
  const tooLong = titles.find((t) => t.length > CHECKLIST_TITLE_MAX);
  if (tooLong) {
    return {
      ok: false,
      errors: { text: `Keep each item under ${CHECKLIST_TITLE_MAX} characters ("${tooLong.slice(0, 20)}…" is too long).` },
    };
  }
  return { ok: true, data: titles.map((title) => ({ title, category, assignedTo: null })) };
}

/** Validate the form against the trip's members and, if it passes, return the item to save. */
export function validateChecklistForm(
  values: ChecklistFormValues,
  context: ChecklistFormContext,
): Validation<ChecklistFormValues, NewChecklistItem> {
  const result = checklistSchema(context).safeParse(values);
  if (!result.success) return { ok: false, errors: firstIssuePerField(result.error) };
  const { title, category, assignedTo } = result.data;
  return { ok: true, data: { title, category, assignedTo: assignedTo === '' ? null : assignedTo } };
}
