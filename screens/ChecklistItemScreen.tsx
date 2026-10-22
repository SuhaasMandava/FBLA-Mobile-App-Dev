import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { useController } from 'react-hook-form';
import { View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CHECKLIST_ICONS } from '../components/categoryIcons';
import { ChoiceChips } from '../components/ChoiceChips';
import { ControlledTextField } from '../components/ControlledTextField';
import { EmptyState } from '../components/EmptyState';
import { FieldMessage } from '../components/FieldMessage';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { SectionHeader } from '../components/SectionHeader';
import { Sheet } from '../components/Sheet';
import { useChecklist } from '../hooks/useChecklist';
import { useChecklistItemForm } from '../hooks/useChecklistItemForm';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS, ChecklistItem } from '../models/ChecklistModel';
import { TripMember, TripModel } from '../models/TripModel';
import { confirmDestructive } from '../utils/confirm';
import { RootNavigation, RootStackParamList } from './types';

/** Add or edit one checklist item. The route's `itemId` selects edit mode. */
export default function ChecklistItemScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  const { items } = useChecklist();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChecklistItem'>>();
  const item = params?.itemId ? items.find((i) => i.id === params.itemId) : undefined;

  // Opened for an item that's gone (deleted on another phone) or with no trip selected.
  if (!activeTrip || (params?.itemId && !item)) {
    return (
      <EmptyState title="This item is gone" body="Someone may have removed it. Go back and pull down to refresh.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <ChecklistItemForm key={item?.id ?? 'new'} item={item} />;
}

const categoryOptions = CHECKLIST_CATEGORIES.map((value) => ({
  value,
  label: CHECKLIST_CATEGORY_LABELS[value],
  icon: CHECKLIST_ICONS[value],
}));

function ChecklistItemForm({ item }: { item?: ChecklistItem }) {
  const navigation = useNavigation<RootNavigation>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChecklistItem'>>();
  const { spacing } = useTheme();
  const [done, setDone] = useState(false);
  const form = useChecklistItemForm({ item, defaultCategory: params?.category, onDone: () => setDone(true) });
  useDiscardGuard(form.control, done, () => navigation.goBack());

  const category = useController({ control: form.control, name: 'category' });
  const assignedTo = useController({ control: form.control, name: 'assignedTo' });

  const nameOf = (member: TripMember) => (member.userId === form.userId ? 'You' : TripModel.memberName(member));

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${item?.title}"?`,
      message: 'It will be removed from the checklist for everyone on the trip.',
      confirmLabel: 'Delete Item',
      onConfirm: form.remove,
    });

  return (
    <Sheet
      footer={
        <>
          <Button
            label={item ? 'Save Changes' : 'Add Item'}
            onPress={form.submit}
            loading={form.submitting}
            disabled={form.deleting}
          />
          {item && form.canDelete ? (
            <Button
              label="Delete Item"
              variant="destructive"
              icon="trash-outline"
              onPress={confirmDelete}
              loading={form.deleting}
              disabled={form.submitting}
            />
          ) : null}
        </>
      }
    >
      <ControlledTextField
        control={form.control}
        name="title"
        label="Item"
        placeholder="e.g. Passports, Book the ferry"
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View style={{ gap: spacing.xs }}>
        <SectionHeader title="Category" />
        <ChoiceChips label="Category" options={categoryOptions} value={category.field.value} onChange={category.field.onChange} />
      </View>

      <ListSection header="Assigned To" footer="Anyone on the trip can be responsible for an item, or leave it for whoever gets to it.">
        <ListRow
          leading={<Icon name="people-outline" size={24} color="labelSecondary" />}
          title="Unassigned"
          trailing={assignedTo.field.value === '' ? 'check' : undefined}
          selected={assignedTo.field.value === ''}
          onPress={() => assignedTo.field.onChange('')}
        />
        {form.members.map((member) => (
          <ListRow
            key={member.userId}
            leading={<Avatar name={member.displayName} size={32} />}
            title={nameOf(member)}
            trailing={member.userId === assignedTo.field.value ? 'check' : undefined}
            selected={member.userId === assignedTo.field.value}
            onPress={() => assignedTo.field.onChange(member.userId)}
          />
        ))}
      </ListSection>
      <FieldMessage error={assignedTo.fieldState.error?.message} />

      {item && !form.canDelete ? (
        <InlineBanner tone="warning" message="Only whoever added this item, or the trip organizer, can delete it." />
      ) : null}
      {form.submitError ? <InlineBanner tone="error" message={form.submitError} /> : null}
    </Sheet>
  );
}
