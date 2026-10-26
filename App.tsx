import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from './components/LoadingScreen';
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

/** Holds the app until the title font is ready (or has failed, in which case the system font stands in). */
function FontGate({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  return loaded || error ? <>{children}</> : <LoadingScreen />;
}

export default function App() {
  useEffect(() => {
    void NotificationService.configure();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <FontGate>
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
          </FontGate>
        </ErrorBoundary>
        <ThemedStatusBar />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
