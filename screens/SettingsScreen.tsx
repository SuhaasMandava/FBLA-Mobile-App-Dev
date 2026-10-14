import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import appConfig from '../app.json';
import { InlineBanner } from '../components/InlineBanner';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { Screen } from '../components/Screen';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { getErrorMessage } from '../services/errors';
import { confirmDestructive } from '../utils/confirm';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { email, userId, signOut } = useAuth();
  const { trips } = useTrip();
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
