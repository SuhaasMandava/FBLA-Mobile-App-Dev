import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  JoinTrip: undefined;
  /** Add an activity (optionally starting on `day`), or edit the one with `itemId`. */
  ItineraryItem: { itemId?: string; day?: string } | undefined;
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
