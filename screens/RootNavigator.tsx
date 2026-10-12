import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusMessage } from '../components/StatusMessage';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import BudgetScreen from './BudgetScreen';
import ChecklistScreen from './ChecklistScreen';
import CreateTripScreen from './CreateTripScreen';
import HomeScreen from './HomeScreen';
import ItineraryItemScreen from './ItineraryItemScreen';
import ItineraryScreen from './ItineraryScreen';
import JoinTripScreen from './JoinTripScreen';
import OnboardingScreen from './OnboardingScreen';
import SettingsScreen from './SettingsScreen';
import TripSwitcherScreen from './TripSwitcherScreen';
import { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Itinerary" component={ItineraryScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Checklist" component={ChecklistScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { scheme, colors } = useTheme();
  const { status } = useAuth();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  // Restoring the saved session takes a moment at startup; don't flash the sign-in screen at someone already signed in.
  if (status === 'loading') return <StatusMessage loading title="Loading…" />;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <Stack.Navigator>
        {status === 'signedIn' ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="TripSwitcher"
              component={TripSwitcherScreen}
              options={{ presentation: 'modal', title: 'Switch Trip' }}
            />
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ title: 'Create a Trip' }} />
            <Stack.Screen name="JoinTrip" component={JoinTripScreen} options={{ title: 'Join a Trip' }} />
            <Stack.Screen
              name="ItineraryItem"
              component={ItineraryItemScreen}
              options={({ route }) => ({
                presentation: 'modal',
                title: route.params?.itemId ? 'Edit Activity' : 'Add Activity',
              })}
            />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
