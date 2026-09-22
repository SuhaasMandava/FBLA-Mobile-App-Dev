import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Must be static `process.env.EXPO_PUBLIC_*` dot-notation references — the
// Expo CLI inlines these from .env at build time and won't recognize
// bracket notation or destructuring.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to a .env file in the project root and restart the dev server.',
  );
}

/** Single shared Supabase client. Configure via .env (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY). */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
