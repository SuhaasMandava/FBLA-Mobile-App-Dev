import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { TripProvider } from './context/TripContext';
import { useTheme } from './hooks/useTheme';
import RootNavigator from './screens/RootNavigator';
import { NotificationService } from './services/NotificationService';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  useEffect(() => {
    NotificationService.configure();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TripProvider>
          <RootNavigator />
          <ThemedStatusBar />
        </TripProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
