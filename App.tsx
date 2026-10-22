import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProviders } from './components/SessionProviders';
import { AuthProvider } from './context/AuthContext';
import { InviteLinkProvider } from './context/InviteLinkContext';
import { NetworkProvider } from './context/NetworkContext';
import { NotificationSettingsProvider } from './context/NotificationSettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hooks/useTheme';
import RootNavigator from './screens/RootNavigator';
import { NotificationService } from './services/NotificationService';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  useEffect(() => {
    void NotificationService.configure();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NetworkProvider>
          <InviteLinkProvider>
            <NotificationSettingsProvider>
              <AuthProvider>
                <SessionProviders>
                  <RootNavigator />
                  <ThemedStatusBar />
                </SessionProviders>
              </AuthProvider>
            </NotificationSettingsProvider>
          </InviteLinkProvider>
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
