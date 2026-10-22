import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import {
  checklistItemToFormValues,
  ChecklistFormValues,
  emptyChecklistForm,
  validateChecklistForm,
} from '../models/ChecklistForm';
import { ChecklistCategory, ChecklistItem, ChecklistModel, NewChecklistItem } from '../models/ChecklistModel';
import { createResolver } from '../utils/formResolver';
import { useAuth } from './useAuth';
import { useChecklist } from './useChecklist';
import { useTrip } from './useTrip';

interface Options {
  /** The item being edited; leave out to add a new one. */
  item?: ChecklistItem;
  /** Category to start a new item in (e.g. the section whose "Add" button was tapped). */
  defaultCategory?: ChecklistCategory;
  /** Runs once the item is saved or deleted. */
  onDone: () => void;
}

/** Form state and save/delete logic for adding or editing a checklist item, checked against the active trip's members. */
export function useChecklistItemForm({ item, defaultCategory, onDone }: Options) {
  const { activeTrip } = useTrip();
  const { userId } = useAuth();
  const { addItem, updateItem, deleteItem } = useChecklist();
  const members = activeTrip?.members ?? [];
  const memberIds = members.map((m) => m.userId);

  const form = useForm<ChecklistFormValues, unknown, NewChecklistItem>({
    defaultValues: item ? checklistItemToFormValues(item, memberIds) : emptyChecklistForm(defaultCategory),
    resolver: createResolver((values) => validateChecklistForm(values, { memberIds })),
    reValidateMode: 'onChange',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (message: string) => {
    setSubmitError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = form.handleSubmit(
    async (data) => {
      setSubmitError(null);
      const result = item ? await updateItem(item.id, data) : await addItem(data);
      if (result.ok) onDone();
      else fail(result.error);
    },
    (errors) => {
      const first = Object.values(errors)[0]?.message;
      if (typeof first === 'string') AccessibilityInfo.announceForAccessibility(first);
    },
  );

  /** Delete the item being edited. Returns after calling onDone, or after showing why it failed. */
  const remove = async () => {
    if (!item || deleting) return;
    setSubmitError(null);
    setDeleting(true);
    const result = await deleteItem(item.id);
    setDeleting(false);
    if (result.ok) onDone();
    else fail(result.error);
  };

  return {
    control: form.control,
    members,
    userId,
    canDelete: item && activeTrip ? ChecklistModel.canDelete(item, activeTrip, userId) : false,
    submit,
    remove,
    submitting: form.formState.isSubmitting,
    deleting,
    submitError,
  };
}
