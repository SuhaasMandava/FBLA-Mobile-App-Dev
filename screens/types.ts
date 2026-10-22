import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChecklistCategory } from '../models/ChecklistModel';

export type TabParamList = {
  Home: undefined;
  Itinerary: undefined;
  Budget: undefined;
  Checklist: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  TripSwitcher: undefined;
  CreateTrip: undefined;
  /** Join a trip; `code` comes prefilled from a join link (triphub://join/CODE). */
  JoinTrip: { code?: string } | undefined;
  /** Add an activity (optionally starting on `day`), or edit the one with `itemId`. */
  ItineraryItem: { itemId?: string; day?: string } | undefined;
  /** Log a new expense, or edit the one with `expenseId`. */
  Expense: { expenseId?: string } | undefined;
  /** Add a checklist item (optionally starting in `category`), or edit the one with `itemId`. */
  ChecklistItem: { itemId?: string; category?: ChecklistCategory } | undefined;
  /** The active trip's details and members, with the organizer tools and Leave Trip. */
  TripSettings: undefined;
  /** Change the active trip's details (organizers only). */
  EditTrip: undefined;
  /** Every announcement on the active trip; organizers post from here. */
  Announcements: undefined;
  /** The comment thread on the activity with `itemId`. */
  ActivityComments: { itemId: string };
};

/** Each tab is a one-screen native stack, which gives it a native (large-title on iOS) header. */
export type TabStackParamList = {
  Main: undefined;
};

/** Navigation as seen from a tab's screen: its own header, the other tabs, and the root sheets. */
export type TabScreenNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<TabStackParamList, 'Main'>,
  CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>
>;

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
