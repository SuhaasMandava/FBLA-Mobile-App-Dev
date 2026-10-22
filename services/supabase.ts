import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { withTimeout } from '../utils/fetchWithTimeout';

// Must be static `process.env.EXPO_PUBLIC_*` dot-notation references — the
// Expo CLI inlines these from .env at build time and won't recognize
// bracket notation or destructuring.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Why the app can't reach its database at all, or null when it's configured. A build made
 * without the two variables shows a "not set up" screen (App.tsx) instead of crashing.
 */
export const backendConfigError: string | null =
  url && anonKey ? null : 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.';

if (backendConfigError) {
  console.error(
    `${backendConfigError} Add them to a .env file in the project root and restart the dev server, ` +
      'or set them as EAS environment variables for builds (see README → Building a preview).',
  );
}

/**
 * Give up on a request after this long, so an unreachable server can't leave a spinner running
 * forever. A timed-out request fails like a dropped connection, which every caller already
 * handles: saved data stays on screen with a message, and sign-in says the server couldn't be reached.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** Single shared Supabase client. Configure via .env (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY). */
export const supabase = createClient(
  // Placeholders keep the app from crashing on import when unconfigured; nothing is sent while backendConfigError is set.
  url ?? 'http://localhost',
  anonKey ?? 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: !backendConfigError,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { fetch: withTimeout(fetch, REQUEST_TIMEOUT_MS) },
  },
);

// Only refresh the session token while the app is in the foreground (Supabase's React Native recommendation).
AppState.addEventListener('change', (state) => {
  if (backendConfigError) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
