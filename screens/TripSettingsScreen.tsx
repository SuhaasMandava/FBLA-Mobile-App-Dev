import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { AccessibilityInfo, ActivityIndicator } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { InlineBanner } from '../components/InlineBanner';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { OfflineBanner } from '../components/OfflineBanner';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { useTripManagement } from '../hooks/useTripManagement';
import { Trip, TripMember, TripModel } from '../models/TripModel';
import { chooseAction, confirmDestructive } from '../utils/confirm';
import { formatDateRange } from '../utils/dates';
import { formatCents } from '../utils/money';
import { RootNavigation } from './types';

/** Details and members of the active trip, with the organizer tools and Leave Trip. */
export default function TripSettingsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { activeTrip } = useTrip();
  if (!activeTrip) {
    return (
      <EmptyState title="No trip selected" body="Pick a trip to see its settings.">
        <Button label="Go Back" variant="tinted" onPress={() => navigation.goBack()} />
      </EmptyState>
    );
  }
  return <TripSettings key={activeTrip.id} trip={activeTrip} />;
}

function TripSettings({ trip }: { trip: Trip }) {
  const navigation = useNavigation<RootNavigation>();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const tools = useTripManagement(trip);
  const busy = tools.task !== null;
  // Tapping Leave Trip while you can't leave explains why, next to the button, instead of doing nothing.
  const [leaveNotice, setLeaveNotice] = useState<string | null>(null);

  const nameOf = (member: TripMember) => TripModel.memberName(member);

  const confirmRemove = (member: TripMember) =>
    confirmDestructive({
      title: `Remove ${nameOf(member)} from the trip?`,
      message: "They'll lose access to its plans, budget, checklist and messages. Expenses they logged stay in the budget.",
      confirmLabel: 'Remove from Trip',
      onConfirm: () => void tools.removeMember(member.userId),
    });

  const confirmPromote = (member: TripMember) =>
    confirmDestructive({
      title: `Make ${nameOf(member)} an organizer?`,
      message: 'Organizers can edit or delete the trip, post announcements, and manage members.',
      confirmLabel: 'Make Organizer',
      destructive: false,
      onConfirm: () => void tools.makeOrganizer(member.userId),
    });

  const openMember = (member: TripMember) =>
    chooseAction({
      title: nameOf(member),
      actions: [
        ...(tools.canPromote(member.userId) ? [{ label: 'Make Organizer', onPress: () => confirmPromote(member) }] : []),
        ...(tools.canRemove(member.userId)
          ? [{ label: 'Remove from Trip', destructive: true, onPress: () => confirmRemove(member) }]
          : []),
      ],
    });

  const confirmLeave = () => {
    if (tools.leaveBlockedReason) {
      setLeaveNotice(tools.leaveBlockedReason);
      AccessibilityInfo.announceForAccessibility(tools.leaveBlockedReason);
      return;
    }
    confirmDestructive({
      title: `Leave "${trip.name}"?`,
      message: "You'll lose access to its plans, budget, checklist and messages. To come back, you'll need the invite code again.",
      confirmLabel: 'Leave Trip',
      onConfirm: () => void tools.leave(),
    });
  };

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${trip.name}" for everyone?`,
      message: 'This removes the trip, its itinerary, expenses, checklist and messages for every member. It cannot be undone.',
      confirmLabel: 'Delete Trip',
      onConfirm: () => void tools.deleteTrip(),
    });

  const spinner = (label: string) => <ActivityIndicator color={colors.accent} accessibilityLabel={label} />;

  return (
    <Sheet>
      <OfflineBanner />
      {tools.error ? <InlineBanner tone="error" message={tools.error} /> : null}

      <ListSection
        header="Trip"
        headerAction={
          tools.isOrganizer
            ? { label: 'Edit', hint: "Opens the trip's details to change them", onPress: () => navigation.navigate('EditTrip') }
            : undefined
        }
        footer={tools.isOrganizer ? undefined : 'Only organizers can change the trip details.'}
      >
        <ListRow leading={<Icon name="flag-outline" size={22} color="accent" />} title="Name" value={trip.name} />
        <ListRow leading={<Icon name="location-outline" size={22} color="accent" />} title="Destination" value={trip.destination} />
        <ListRow
          leading={<Icon name="calendar-outline" size={22} color="accent" />}
          title="Dates"
          value={formatDateRange(trip.startDate, trip.endDate)}
        />
        <ListRow
          leading={<Icon name="wallet-outline" size={22} color="accent" />}
          title="Budget"
          value={trip.budgetCents > 0 ? formatCents(trip.budgetCents) : 'Not set'}
        />
      </ListSection>

      <ListSection
        header={`Members · ${trip.members.length}`}
        footer={tools.isOrganizer ? 'Tap someone to make them an organizer or remove them from the trip.' : undefined}
      >
        {trip.members.map((member) => {
          const me = member.userId === userId;
          const manageable = tools.canPromote(member.userId) || tools.canRemove(member.userId);
          const working = tools.task && 'memberId' in tools.task && tools.task.memberId === member.userId;
          const role = member.role === 'organizer' ? 'Organizer' : null;
          return (
            <ListRow
              key={member.userId}
              leading={<Avatar name={member.displayName} size={32} />}
              title={me ? `${nameOf(member)} (you)` : nameOf(member)}
              trailing={working ? spinner('Updating member') : role ? <Badge label={role} /> : manageable ? 'chevron' : undefined}
              accessibilityLabel={`${nameOf(member)}${me ? ', you' : ''}${role ? ', organizer' : ''}`}
              accessibilityHint={manageable ? 'Shows options for this member' : undefined}
              accessibilityActions={[
                ...(tools.canPromote(member.userId) ? [{ name: 'promote', label: 'Make organizer' }] : []),
                ...(tools.canRemove(member.userId) ? [{ name: 'remove', label: 'Remove from trip' }] : []),
              ]}
              onAccessibilityAction={(e) =>
                e.nativeEvent.actionName === 'promote' ? confirmPromote(member) : confirmRemove(member)
              }
              onPress={manageable && !busy ? () => openMember(member) : undefined}
            />
          );
        })}
      </ListSection>

      {leaveNotice ? <InlineBanner tone="warning" message={leaveNotice} /> : null}
      <ListSection>
        <ListRow
          leading={tools.task?.kind === 'leave' ? spinner('Leaving trip') : <Icon name="exit-outline" size={24} color="danger" />}
          title="Leave Trip"
          destructive
          accessibilityHint={
            tools.leaveBlockedReason ? 'Explains why you can’t leave yet' : 'Asks before removing you from the trip'
          }
          onPress={busy ? undefined : confirmLeave}
        />
        {tools.isOrganizer ? (
          <ListRow
            leading={tools.task?.kind === 'delete' ? spinner('Deleting trip') : <Icon name="trash-outline" size={24} color="danger" />}
            title="Delete Trip"
            destructive
            accessibilityHint="Asks before deleting the trip for everyone"
            onPress={busy ? undefined : confirmDelete}
          />
        ) : null}
      </ListSection>
    </Sheet>
  );
}
