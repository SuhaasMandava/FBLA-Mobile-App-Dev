import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { validateQuickAdd } from '../models/ChecklistForm';
import { ChecklistCategory } from '../models/ChecklistModel';
import { useChecklist } from './useChecklist';

/**
 * State and logic for the Checklist's quick-add box: type an item and press return to add it,
 * and keep typing; paste a list to add one item per line. Items are added in order, and if
 * one fails the rest stay in the box so nothing typed is lost.
 */
export function useQuickAdd() {
  const { addItem } = useChecklist();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ChecklistCategory>('packing');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (adding) return;
    const result = validateQuickAdd(text, category);
    if (!result.ok) {
      const message = result.errors.text ?? 'Check the item and try again.';
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    setError(null);
    setAdding(true);
    const submitted = text;
    const items = result.data;
    let added = 0;
    for (const item of items) {
      const saved = await addItem(item);
      if (!saved.ok) {
        // Leave what wasn't added in the box (plus anything typed meanwhile).
        const unsaved = items.slice(added).map((i) => i.title).join('\n');
        setText((current) =>
          current.startsWith(submitted)
            ? [unsaved, current.slice(submitted.length).trim()].filter(Boolean).join('\n')
            : current,
        );
        const message = added > 0 ? `Added ${added} of ${items.length}. ${saved.error}` : saved.error;
        setError(message);
        AccessibilityInfo.announceForAccessibility(message);
        setAdding(false);
        return;
      }
      added += 1;
    }
    // Keep anything typed while these were saving; the box stays focused throughout.
    setText((current) => (current.startsWith(submitted) ? current.slice(submitted.length).trimStart() : current));
    setAdding(false);
    AccessibilityInfo.announceForAccessibility(added === 1 ? `Added ${items[0].title}` : `Added ${added} items`);
  };

  return {
    text,
    setText: (value: string) => {
      setText(value);
      if (error) setError(null);
    },
    category,
    setCategory,
    submit,
    adding,
    error,
  };
}
