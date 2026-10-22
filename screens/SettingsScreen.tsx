import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Linking } from 'react-native';
import appConfig from '../app.json';
import { InlineBanner } from '../components/InlineBanner';
import { Icon, IconName } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { Screen } from '../components/Screen';
import { SwitchRow } from '../components/SwitchRow';
import { ThemePreference } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { REMINDER_LEAD_MINUTES } from '../models/ReminderModel';
import { getErrorMessage } from '../services/errors';
import { confirmDestructive } from '../utils/confirm';
import { TabScreenNavigation } from './types';

/** Reminder switches, plus what to do when the phone has notifications turned off for TripHub. */
function NotificationSettings() {
  const { prefs, setPref, permission, requestPermission } = useNotificationSettings();
  const unsupported = permission === 'unsupported';

  // Turning a switch on is the moment to ask the phone for permission, if it hasn't been asked yet.
  const toggle = (key: 'activityReminders' | 'expenseAlerts') => (on: boolean) => {
    setPref(key, on);
    if (on && permission === 'undetermined') void requestPermission();
  };

  return (
    <>
      {permission === 'denied' ? (
        <InlineBanner
          tone="warning"
          message="Notifications are turned off for TripHub in your phone's settings, so reminders can't appear."
          action={{ label: 'Open Settings', onPress: () => void Linking.openSettings() }}
        />
      ) : null}
      <ListSection
        header="Reminders"
        footer={
          unsupported
            ? 'Reminders work in the installed app (a development or preview build), not in Expo Go or a web browser.'
            : 'Expense alerts appear while TripHub is open or running. Reminders are scheduled for the trip you have open.'
        }
      >
        <SwitchRow
          leading={<Icon name="alarm-outline" size={24} color="accent" />}
          title="Activity reminders"
          subtitle={`${REMINDER_LEAD_MINUTES} minutes before activities that have a start time`}
          value={prefs.activityReminders && !unsupported}
          onValueChange={toggle('activityReminders')}
          disabled={unsupported}
        />
        <SwitchRow
          leading={<Icon name="receipt-outline" size={24} color="accent" />}
          title="New expense alerts"
          subtitle="When someone else on your trip logs an expense"
          value={prefs.expenseAlerts && !unsupported}
          onValueChange={toggle('expenseAlerts')}
          disabled={unsupported}
        />
        {permission === 'undetermined' && (prefs.activityReminders || prefs.expenseAlerts) ? (
          <ListRow
            leading={<Icon name="notifications-outline" size={24} color="accent" />}
            title="Allow Notifications"
            subtitle="Your phone asks once whether TripHub may notify you."
            trailing="chevron"
            onPress={() => void requestPermission()}
          />
        ) : null}
      </ListSection>
    </>
  );
}

const appearanceOptions: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Device Setting', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { email, userId, signOut } = useAuth();
  const navigation = useNavigation<TabScreenNavigation>();
  const { trips, activeTrip } = useTrip();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // The name other members see, as stored on any trip you're on.
  const name = trips.flatMap((t) => t.members).find((m) => m.userId === userId)?.displayName ?? null;

  const doSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (e) {
      setSigningOut(false);
      setSignOutError(getErrorMessage(e));
    }
  };

  const confirmSignOut = () =>
    confirmDestructive({
      title: 'Sign out of TripHub?',
      message: 'Trips saved on this phone will be removed. You can sign back in any time.',
      confirmLabel: 'Sign Out',
      onConfirm: doSignOut,
    });

  return (
    <Screen>
      <ListSection header="Account">
        {name ? <ListRow leading={<Icon name="person-circle-outline" size={24} color="accent" />} title="Name" value={name} /> : null}
        <ListRow leading={<Icon name="mail-outline" size={24} color="accent" />} title="Email" subtitle={email ?? 'Unknown'} />
      </ListSection>

      {activeTrip ? (
        <ListSection header="Current Trip">
          <ListRow
            leading={<Icon name="airplane-outline" size={24} color="accent" />}
            title={activeTrip.name}
            subtitle="Details, members, leave or delete"
            trailing="chevron"
            accessibilityHint="Opens trip settings"
            onPress={() => navigation.navigate('TripSettings')}
          />
        </ListSection>
      ) : null}

      <NotificationSettings />

      <ListSection header="Appearance" footer="Device Setting follows your phone's light or dark mode.">
        {appearanceOptions.map((o) => (
          <ListRow
            key={o.value}
            leading={<Icon name={o.icon} size={24} color="accent" />}
            title={o.label}
            trailing={preference === o.value ? 'check' : undefined}
            selected={preference === o.value}
            onPress={() => setPreference(o.value)}
          />
        ))}
      </ListSection>

      <ListSection header="About" footer="Made for the FBLA Mobile Application Development event.">
        <ListRow
          leading={<Icon name="information-circle-outline" size={24} color="accent" />}
          title="TripHub"
          value={`Version ${appConfig.expo.version}`}
        />
      </ListSection>

      {signOutError ? <InlineBanner tone="error" message={`Couldn't sign out. ${signOutError}`} /> : null}

      <ListSection>
        <ListRow
          leading={
            signingOut ? (
              <ActivityIndicator color={colors.danger} accessibilityLabel="Signing out" />
            ) : (
              <Icon name="log-out-outline" size={24} color="danger" />
            )
          }
          title="Sign Out"
          destructive
          accessibilityHint="Asks before signing you out"
          onPress={signingOut ? undefined : confirmSignOut}
        />
      </ListSection>
    </Screen>
  );
}
