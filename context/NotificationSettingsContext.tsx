import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs, parseNotificationPrefs } from '../models/ReminderModel';
import { NotificationPermission, NotificationService } from '../services/NotificationService';

export interface NotificationSettingsValue {
  /** What the person wants (saved on this phone). Reminders only go out when `permission` is also 'granted'. */
  prefs: NotificationPrefs;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
  /** What the phone allows. 'unsupported' in Expo Go and on the web. */
  permission: NotificationPermission;
  /** Ask the phone for permission (only prompts if it hasn't been answered yet). */
  requestPermission: () => Promise<NotificationPermission>;
}

export const NotificationSettingsContext = createContext<NotificationSettingsValue | undefined>(undefined);

const PREFS_KEY = 'triphub.notificationPrefs';

/** Reminder preferences and the phone's notification permission, kept in step with the system Settings app. */
export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => setPrefs(parseNotificationPrefs(raw)))
      .catch(() => {});
  }, []);

  // Read the permission at start, and again on returning to the app (it may have been changed in Settings).
  useEffect(() => {
    const check = () => void NotificationService.getPermission().then(setPermission);
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  const setPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await NotificationService.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const value = useMemo(
    () => ({ prefs, setPref, permission, requestPermission }),
    [prefs, setPref, permission, requestPermission],
  );
  return <NotificationSettingsContext.Provider value={value}>{children}</NotificationSettingsContext.Provider>;
}
