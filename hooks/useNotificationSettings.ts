import { useContext } from 'react';
import { NotificationSettingsContext, NotificationSettingsValue } from '../context/NotificationSettingsContext';

export function useNotificationSettings(): NotificationSettingsValue {
  const ctx = useContext(NotificationSettingsContext);
  if (!ctx) throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  return ctx;
}
