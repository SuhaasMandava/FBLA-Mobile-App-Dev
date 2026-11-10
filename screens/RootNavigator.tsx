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
import { Platform } from 'react-native';
import { GlassTabBar, TabBarSpace } from '../components/GlassTabBar';
import { HeaderButton } from '../components/HeaderButton';
import { IconName } from '../components/Icon';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import { useIntro } from '../hooks/useIntro';
import { useInviteLink } from '../hooks/useInviteLink';
import { useTheme } from '../hooks/useTheme';
import { useTrip } from '../hooks/useTrip';
import { fonts } from '../theme/theme';
import ActivityCommentsScreen from './ActivityCommentsScreen';
import AnnouncementsScreen from './AnnouncementsScreen';
import BudgetScreen from './BudgetScreen';
import ChatScreen from './ChatScreen';
import ChecklistItemScreen from './ChecklistItemScreen';
import ChecklistScreen from './ChecklistScreen';
import CreateTripScreen from './CreateTripScreen';
import EditTripScreen from './EditTripScreen';
import ExpenseScreen from './ExpenseScreen';
import HomeScreen from './HomeScreen';
import ItineraryItemScreen from './ItineraryItemScreen';
import ItineraryScreen from './ItineraryScreen';
import EditNameScreen from './EditNameScreen';
import JoinTripScreen from './JoinTripScreen';
import OnboardingScreen from './OnboardingScreen';
import SettingsScreen from './SettingsScreen';
import TripSummaryScreen from './TripSummaryScreen';
import TripSettingsScreen from './TripSettingsScreen';
import TripSwitcherScreen from './TripSwitcherScreen';
import WelcomeScreen from './WelcomeScreen';
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
    headerTitleStyle: { color: colors.label, fontFamily: fonts.display },
    headerLargeTitleStyle: { color: colors.label, fontFamily: fonts.display },
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };
}

/**
 * iOS tab screens: a large title over a see-through bar, so content scrolls under it. iOS 26 draws the bar
 * and its buttons as Liquid Glass; earlier versions blur. Screens there use `contentInsetAdjustmentBehavior`.
 */
const tabHeaderOptions: NativeStackNavigationOptions =
  Platform.OS === 'ios'
    ? {
        headerLargeTitleEnabled: true,
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterial',
        headerStyle: { backgroundColor: 'transparent' },
        headerLargeStyle: { backgroundColor: 'transparent' },
      }
    : {};

/** Wraps a tab's screen in its own stack so it gets a native header: large title on iOS, top app bar on Android. */
function tabStack(Component: ComponentType, title: string) {
  // Switching trips keeps the navigator and the open tab, but each screen starts fresh for the new trip
  // (no leftover edit mode or error banner from the last one).
  function PerTripScreen() {
    const { activeTripId } = useTrip();
    return <Component key={activeTripId ?? 'no-trip'} />;
  }
  function TabStackScreen() {
    const headerOptions = useHeaderOptions();
    return (
      <TabStack.Navigator screenOptions={{ ...headerOptions, ...tabHeaderOptions }}>
        <TabStack.Screen name="Main" component={PerTripScreen} options={{ title }} />
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

/** The tabs sit under a floating glass bar (`GlassTabBar`); screens pad their content with `useTabBarInset`. */
function Tabs() {
  return (
    <TabBarSpace>
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} icons={tabIcons} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Itinerary" component={ItineraryStack} />
        <Tab.Screen name="Budget" component={BudgetStack} />
        <Tab.Screen name="Checklist" component={ChecklistStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </TabBarSpace>
  );
}

/** Leading Cancel for form sheets on iOS. Android modals already have a back arrow. */
function CancelButton() {
  const navigation = useNavigation();
  return <HeaderButton label="Cancel" onPress={() => navigation.goBack()} />;
}

/** Trailing Done on iOS for sheets you read or manage things in (messages, trip settings): closing them isn't "cancelling". */
function DoneButton() {
  const navigation = useNavigation();
  return <HeaderButton label="Done" prominent onPress={() => navigation.goBack()} />;
}

/**
 * Opens the Join screen for a join link (triphub://join/CODE) once someone is signed in.
 * Waits for their trips to load first, so the Join screen opens over a settled Home screen.
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
  const { seen: introSeen } = useIntro();
  useOpenJoinLink(ready);

  // Restoring the saved session takes a moment at startup; don't flash the sign-in screen at someone already signed in.
  // (Likewise whether this phone has seen the intro yet.)
  if (status === 'loading' || introSeen === null) return <LoadingScreen />;

  const formSheet: NativeStackNavigationOptions = {
    presentation: 'modal',
    headerLeft: Platform.OS === 'ios' ? () => <CancelButton /> : undefined,
    // Dark mode shows modals on a raised surface, the way the system does.
    headerStyle: { backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.background },
  };
  const doneSheet: NativeStackNavigationOptions = {
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
                sheetCornerRadius: 28,
                contentStyle: { backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.background },
              }}
            />
            {/* Forms open as full modals (not pushed inside the sheet, which would squeeze them into half a screen). */}
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ ...formSheet, title: 'New Trip' }} />
            <Stack.Screen name="EditName" component={EditNameScreen} options={{ ...formSheet, title: 'Your Name' }} />
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
            <Stack.Screen name="TripSettings" component={TripSettingsScreen} options={{ ...doneSheet, title: 'Trip Settings' }} />
            <Stack.Screen name="TripSummary" component={TripSummaryScreen} options={{ ...doneSheet, title: 'Trip Summary' }} />
            <Stack.Screen name="EditTrip" component={EditTripScreen} options={{ ...formSheet, title: 'Edit Trip' }} />
            <Stack.Screen name="Intro" component={WelcomeScreen} options={{ ...doneSheet, title: 'How TripHub Works' }} />
            {/* The chat has its own composer and manages the keyboard itself. */}
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ ...doneSheet, title: 'Trip Chat', headerStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ ...doneSheet, title: 'Announcements' }} />
            <Stack.Screen name="ActivityComments" component={ActivityCommentsScreen} options={{ ...doneSheet, title: 'Comments' }} />
          </>
        ) : (
          <>
            {introSeen ? null : <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
