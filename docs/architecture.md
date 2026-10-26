# Architecture

MVVM. Full diagram: `README.md` → Architecture (MVVM). React Navigation (stack + bottom tabs), not Expo Router: routes in `screens/RootNavigator.tsx`, param types in `screens/types.ts`.

| Layer | Folder | Rule |
| --- | --- | --- |
| View | `screens/`, `components/`, `theme/theme.ts` | Draw and forward taps only. Use design tokens and shared components. |
| ViewModel | `context/`, `hooks/` | Providers hold state per feature (Trip, Itinerary, Expense, Checklist, Communication). Form hooks (`useExpenseForm`, `useCreateTripForm`...) wrap react-hook-form plus a zod model. |
| Model | `models/` | Plain TypeScript: zod forms (`*Form.ts`, `validation.ts`), calculators (`BudgetCalculator.ts`). No React, no network. Tests in `models/__tests__/`. |
| Services | `services/` | The only code that talks to Supabase or the device (`TripService`, `ExpenseService`, `SettlementService`, `NotificationService`, `RealtimeService`, `ShareService`, `CacheService`...). |
| Utils | `utils/` | Pure helpers: `money.ts`, `dates.ts`, `inviteCode.ts`, `inviteLink.ts`, `shareTargets.ts`, `tripProgress.ts`. Tests in `utils/__tests__/`. |
| Database | `supabase/` | `schema.sql` baseline, `migrations/001` to `011` (010 = settlements, 011 = audit fixes), `seed/demo_trip.sql`. |

## Entry and provider order
`index.ts` → `App.tsx` → `screens/RootNavigator.tsx`. In `App.tsx`, outer to inner: Theme, ErrorBoundary, Network, InviteLink, NotificationSettings, Intro, Auth, then `components/SessionProviders.tsx` (the per-trip providers). If the Supabase env vars are missing, `App.tsx` shows a "TripHub isn't set up yet" screen instead (`backendConfigError` in `services/supabase.ts`).

## Data flow
Screen → hook or context → model (validate/calculate) → service → Supabase. Live updates come back through `services/RealtimeService.ts`, wired by `hooks/useLiveSync.ts` in the Itinerary, Expense, Checklist and Communication contexts. Reads are cached per user in AsyncStorage by `services/CacheService.ts` (key prefix `cache:v1`).

## Errors
Messages safe to show users use `UserFacingError` / `TripServiceError` (`services/errors.ts`, codes such as `not_permitted`, `last_organizer`).

## Dev-only code
`services/DevBypass.ts` signs in a fixed test account behind `__DEV__`, used from `screens/OnboardingScreen.tsx`. Remove both "DEV BYPASS" spots to delete it.

## Where features live
Feature → file table: `docs/planning/requirements-map.md`.

## Trip Hub components (Oct 25)
`components/TripTicket.tsx` (hero), `GlanceTile.tsx`, `InviteCode.tsx`, `Reveal.tsx` (entrance animation), used by `screens/HomeScreen.tsx`. `FontGate` in `App.tsx` loads Bricolage Grotesque (`@expo-google-fonts/bricolage-grotesque`). `utils/tripProgress.ts` gains `tripCountdown`. See [[trip-hub]].
`components/HeroStat.tsx` (navy headline card with stub) is used by Budget and Checklist.
Stack as of Oct 26: Expo SDK 58, React Native 0.88, React 19.3 (upgraded from 57 so iOS Expo Go can open the app). EAS project linked in `app.json` (`extra.eas.projectId`), env vars set for the `preview` environment.
