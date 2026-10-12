import { NavigatorScreenParams } from '@react-navigation/native';

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
};
