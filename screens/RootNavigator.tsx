import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { ComponentType, useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { HeaderButton } from '../components/HeaderButton';
import { Icon, IconName } from '../components/Icon';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import { useInviteLink } from '../hooks/useInviteLink';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import ActivityCommentsScreen from './ActivityCommentsScreen';
import AnnouncementsScreen from './AnnouncementsScreen';
import BudgetScreen from './BudgetScreen';
import ChecklistItemScreen from './ChecklistItemScreen';
import ChecklistScreen from './ChecklistScreen';
import CreateTripScreen from './CreateTripScreen';
import ExpenseScreen from './ExpenseScreen';
import HomeScreen from './HomeScreen';
import ItineraryItemScreen from './ItineraryItemScreen';
import ItineraryScreen from './ItineraryScreen';
import JoinTripScreen from './JoinTripScreen';
import OnboardingScreen from './OnboardingScreen';
import SettingsScreen from './SettingsScreen';
import TripSwitcherScreen from './TripSwitcherScreen';
import { RootStackParamList, TabParamList, TabStackParamList } from './types';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TabStack = createNativeStackNavigator<TabStackParamList>();

/** Header look shared by every native stack: system font, theme colors, no hairline under large titles. */
function useHeaderOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.label },
    headerLargeTitleStyle: { color: colors.label },
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };
}

/** Wraps a tab's screen in its own stack so it gets a native header: large title on iOS, top app bar on Android. */
function tabStack(component: ComponentType, title: string) {
  function TabStackScreen() {
    const headerOptions = useHeaderOptions();
    return (
      <TabStack.Navigator screenOptions={{ ...headerOptions, headerLargeTitleEnabled: Platform.OS === 'ios' }}>
        <TabStack.Screen name="Main" component={component} options={{ title }} />
      </TabStack.Navigator>
    );
  }
  TabStackScreen.displayName = `${title}Stack`;
  return TabStackScreen;
}

const HomeStack = tabStack(HomeScreen, 'Home');
const ItineraryStack = tabStack(ItineraryScreen, 'Itinerary');
const BudgetStack = tabStack(BudgetScreen, 'Budget');
const ChecklistStack = tabStack(ChecklistScreen, 'Checklist');
const SettingsStack = tabStack(SettingsScreen, 'Settings');

const tabIcons: Record<keyof TabParamList, [active: IconName, inactive: IconName]> = {
  Home: ['home', 'home-outline'],
  Itinerary: ['map', 'map-outline'],
  Budget: ['wallet', 'wallet-outline'],
  Checklist: ['checkbox', 'checkbox-outline'],
  Settings: ['settings', 'settings-outline'],
};

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Explicit colors: the default inactive tint is a 50% blend that falls below the contrast minimum.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.labelSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator },
        // The bar's height is fixed by the system, so labels grow only so far with the text size.
        tabBarLabel: ({ color, children }) => (
          <Text maxFontSizeMultiplier={1.5} style={{ color, fontSize: 11, lineHeight: 13, fontWeight: '500' }}>
            {children}
          </Text>
        ),
        tabBarIcon: ({ focused, color, size }) => (
          <Icon name={tabIcons[route.name][focused ? 0 : 1]} tint={color} size={size} fixedSize />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Itinerary" component={ItineraryStack} />
      <Tab.Screen name="Budget" component={BudgetStack} />
      <Tab.Screen name="Checklist" component={ChecklistStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

/** Leading Cancel for form sheets on iOS. Android modals already have a back arrow. */
function CancelButton() {
  const navigation = useNavigation();
  return <HeaderButton label="Cancel" onPress={() => navigation.goBack()} />;
}

/** Trailing Done for message sheets on iOS: they're for reading, so closing isn't "cancelling". */
function DoneButton() {
  const navigation = useNavigation();
  return <HeaderButton label="Done" prominent onPress={() => navigation.goBack()} />;
}

/**
 * Opens the Join screen for a join link (triphub://join/CODE) once someone is signed in.
 * Waits for their trips to load first: picking the first trip remounts the navigator
 * (see SessionProviders), which would close a Join screen opened any earlier.
 */
function useOpenJoinLink(ready: boolean) {
  const { status } = useAuth();
  const { loading: tripsLoading } = useTrip();
  const { pendingCode, clearPendingCode } = useInviteLink();
  useEffect(() => {
    if (!ready || status !== 'signedIn' || tripsLoading || !pendingCode || !navigationRef.isReady()) return;
    navigationRef.navigate('JoinTrip', { code: pendingCode });
    clearPendingCode();
  }, [ready, status, tripsLoading, pendingCode, clearPendingCode]);
}

export default function RootNavigator() {
  const { scheme, colors } = useTheme();
  const { status } = useAuth();
  const headerOptions = useHeaderOptions();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const [ready, setReady] = useState(false);
  useOpenJoinLink(ready);

  // Restoring the saved session takes a moment at startup; don't flash the sign-in screen at someone already signed in.
  if (status === 'loading') return <LoadingScreen />;

  const formSheet: NativeStackNavigationOptions = {
    presentation: 'modal',
    headerLeft: Platform.OS === 'ios' ? () => <CancelButton /> : undefined,
    // Dark mode shows modals on a raised surface, the way the system does.
    headerStyle: { backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.background },
  };
  const messageSheet: NativeStackNavigationOptions = {
    ...formSheet,
    headerLeft: undefined,
    headerRight: Platform.OS === 'ios' ? () => <DoneButton /> : undefined,
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setReady(true)}
      theme={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.label,
          border: colors.separator,
          primary: colors.accent,
          notification: colors.danger,
        },
      }}
    >
      <Stack.Navigator screenOptions={headerOptions}>
        {status === 'signedIn' ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            {/* A bottom sheet that rests at half height and can be pulled up. Title and grabber are drawn by the sheet itself. */}
            <Stack.Screen
              name="TripSwitcher"
              component={TripSwitcherScreen}
              options={{
                presentation: 'formSheet',
                headerShown: false,
                sheetAllowedDetents: [0.55, 0.92],
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                contentStyle: { backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.background },
              }}
            />
            {/* Forms open as full modals (not pushed inside the sheet, which would squeeze them into half a screen). */}
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ ...formSheet, title: 'New Trip' }} />
            <Stack.Screen name="JoinTrip" component={JoinTripScreen} options={{ ...formSheet, title: 'Join Trip' }} />
            <Stack.Screen
              name="ItineraryItem"
              component={ItineraryItemScreen}
              options={({ route }) => ({
                ...formSheet,
                title: route.params?.itemId ? 'Edit Activity' : 'New Activity',
              })}
            />
            <Stack.Screen
              name="Expense"
              component={ExpenseScreen}
              options={({ route }) => ({
                ...formSheet,
                title: route.params?.expenseId ? 'Edit Expense' : 'New Expense',
              })}
            />
            <Stack.Screen
              name="ChecklistItem"
              component={ChecklistItemScreen}
              options={({ route }) => ({
                ...formSheet,
                title: route.params?.itemId ? 'Edit Item' : 'New Item',
              })}
            />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ ...messageSheet, title: 'Announcements' }} />
            <Stack.Screen name="ActivityComments" component={ActivityCommentsScreen} options={{ ...messageSheet, title: 'Comments' }} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
