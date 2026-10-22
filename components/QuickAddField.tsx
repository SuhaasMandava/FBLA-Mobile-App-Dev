import { useQuickAdd } from '../hooks/useQuickAdd';
import { CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS, ChecklistCategory } from '../models/ChecklistModel';
import { Button } from './Button';
import { Card } from './Card';
import { CHECKLIST_ICONS } from './categoryIcons';
import { ChoiceChips } from './ChoiceChips';
import { TextField } from './TextField';

const categoryOptions = CHECKLIST_CATEGORIES.map((value) => ({
  value,
  label: CHECKLIST_CATEGORY_LABELS[value],
  icon: CHECKLIST_ICONS[value],
}));

const PLACEHOLDERS: Record<ChecklistCategory, string> = {
  packing: 'e.g. Sunscreen',
  todo: 'e.g. Buy snacks',
  booking: 'e.g. Ferry tickets',
};

/**
 * Add checklist items fast: pick a group once, then type an item and press return, again
 * and again. The keyboard stays up between items. Pasting a list adds one item per line.
 * Assigning someone, or renaming, is still done by opening an item.
 */
export function QuickAddField() {
  const quick = useQuickAdd();
  return (
    <Card>
      <ChoiceChips label="Add to" options={categoryOptions} value={quick.category} onChange={quick.setCategory} />
      {/* Multiline so a pasted list keeps its line breaks; return still adds the item and keeps the keyboard up. */}
      <TextField
        label="Quick add"
        helper="Press return after each item. Paste a list to add one item per line."
        error={quick.error}
        value={quick.text}
        onChangeText={quick.setText}
        placeholder={PLACEHOLDERS[quick.category]}
        autoCapitalize="sentences"
        multiline
        growing
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={() => void quick.submit()}
      />
      <Button
        label={`Add to ${CHECKLIST_CATEGORY_LABELS[quick.category]}`}
        icon="add"
        variant="tinted"
        onPress={() => void quick.submit()}
        loading={quick.adding}
        disabled={quick.text.trim() === ''}
      />
    </Card>
  );
}
