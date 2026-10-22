import { ChecklistCategory } from '../models/ChecklistModel';
import { ExpenseCategory } from '../models/ExpenseModel';
import { IconName } from './Icon';

/** The icon shown for each expense category (models stay free of UI types, so the mapping lives here). */
export const CATEGORY_ICONS: Record<ExpenseCategory, IconName> = {
  lodging: 'bed-outline',
  food: 'restaurant-outline',
  transport: 'car-outline',
  activities: 'ticket-outline',
  shopping: 'bag-handle-outline',
  other: 'pricetag-outline',
};

/** The icon shown for each checklist category. */
export const CHECKLIST_ICONS: Record<ChecklistCategory, IconName> = {
  packing: 'bag-handle-outline',
  todo: 'list-outline',
  booking: 'calendar-outline',
};
