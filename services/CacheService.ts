import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Saved copies of server data so the app can show something with no connection.
 * Keys carry a version (bump it if a saved shape changes) and the user id, so
 * one person's data is never read by another.
 */
const PREFIX = 'cache:v1';
const LAST_USER_KEY = `${PREFIX}:last-user`;

const userKey = (userId: string, name: string) => `${PREFIX}:${userId}:${name}`;

export interface RememberedUser {
  id: string;
  email: string | null;
}

export const CacheService = {
  /** The saved value, or null if there's none or it can't be read (a cache miss is never an error). */
  async read<T>(userId: string, name: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(userKey(userId, name));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      console.warn('Cache read failed', name, e);
      return null;
    }
  },

  /** Save a value. Failures are logged and ignored: the cache is an optimization, not a requirement. */
  async write(userId: string, name: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(userKey(userId, name), JSON.stringify(value));
    } catch (e) {
      console.warn('Cache write failed', name, e);
    }
  },

  /** Forget everything saved for this user (on sign-out). */
  async clearUser(userId: string): Promise<void> {
    try {
      const prefix = `${PREFIX}:${userId}:`;
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
      if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.warn('Cache clear failed', e);
    }
  },

  /** Who was last signed in on this device, so an offline start can still open their saved data. */
  async readLastUser(): Promise<RememberedUser | null> {
    try {
      const raw = await AsyncStorage.getItem(LAST_USER_KEY);
      return raw ? (JSON.parse(raw) as RememberedUser) : null;
    } catch {
      return null;
    }
  },

  async writeLastUser(user: RememberedUser): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Remembering user failed', e);
    }
  },

  async clearLastUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_USER_KEY);
    } catch (e) {
      console.warn('Forgetting user failed', e);
    }
  },
};
