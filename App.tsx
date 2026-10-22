import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EmptyState } from './components/EmptyState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SessionProviders } from './components/SessionProviders';
import { AuthProvider } from './context/AuthContext';
import { IntroProvider } from './context/IntroContext';
import { InviteLinkProvider } from './context/InviteLinkContext';
import { NetworkProvider } from './context/NetworkContext';
import { NotificationSettingsProvider } from './context/NotificationSettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hooks/useTheme';
import RootNavigator from './screens/RootNavigator';
import { NotificationService } from './services/NotificationService';
import { backendConfigError } from './services/supabase';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/** A build made without the Supabase settings can't sign anyone in; say so instead of failing at every tap. */
function NotSetUp() {
  return (
    <EmptyState
      tone="error"
      title="TripHub isn't set up yet"
      body="This copy of the app wasn't given its server address, so it can't sign in or load trips. If you're testing a build, ask the team for a version made with the Supabase settings."
    />
  );
}

export default function App() {
  useEffect(() => {
    void NotificationService.configure();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          {backendConfigError ? (
            <NotSetUp />
          ) : (
            <NetworkProvider>
              <InviteLinkProvider>
                <NotificationSettingsProvider>
                  <IntroProvider>
                    <AuthProvider>
                      <SessionProviders>
                        <RootNavigator />
                      </SessionProviders>
                    </AuthProvider>
                  </IntroProvider>
                </NotificationSettingsProvider>
              </InviteLinkProvider>
            </NetworkProvider>
          )}
        </ErrorBoundary>
        <ThemedStatusBar />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
