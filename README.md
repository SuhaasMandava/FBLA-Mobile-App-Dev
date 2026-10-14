# TripHub

TripHub is a group trip planner built with Expo and React Native. People sign up, create or join a trip with an invite code, and plan its itinerary together. Data lives in Supabase.

## Getting started

```bash
npm install
npx expo start
```

Create a `.env` file in the project root (it is git-ignored) with your Supabase project's values:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Restart the dev server after changing it. Checks to run before committing:

```bash
npx tsc --noEmit   # types
npx expo lint .    # lint (the bare `expo lint` only checks components/)
npm run check:contrast  # WCAG contrast of the color tokens
```

### Setting up Supabase

1. In the SQL editor, run `supabase/schema.sql` (the baseline), then every file in `supabase/migrations/` **in numeric order**. All of them are safe to re-run.
2. Authentication → Sign In / Providers → **Email**: keep it enabled and turn **"Confirm email" off**. The app doesn't use email confirmation; new accounts are signed in immediately. With it on, sign-up can't complete. Anonymous sign-ins are not used.
3. Nothing else is needed: Row Level Security is switched on by the migrations (see below).

The anon key in `.env` is public by design (it ships inside the app). Row Level Security is what protects the data, which is why every table has it on.

## How the code is organized

| Folder | What lives there |
| --- | --- |
| `models/` | Plain data types, row mapping, and rules. Validation lives here as zod schemas (`TripForm`, `ItineraryForm`, `AuthForm`). No React, no network. |
| `services/` | Everything that talks to Supabase or the device: `TripService`, `AuthService`, `CacheService`, `NetworkService`, `ShareService`. They throw typed errors with user-safe messages. |
| `context/`, `hooks/` | App state (auth, trips, itinerary, network, theme) and the form hooks that tie react-hook-form to the models and services. |
| `theme/` | Design tokens (`theme.ts`): colors for light and dark, type roles, spacing, radii, motion. Read through `useTheme()`. |
| `screens/`, `components/` | Presentation only. Navigation is React Navigation (`App.tsx` → `screens/RootNavigator.tsx`). Screens are built from the shared components; none defines its own button, row, or field styles. |
| `scripts/` | `check-contrast.js` (WCAG check of the color tokens) and `make-icons.py` (draws the app icon and splash). |
| `supabase/` | `schema.sql` (baseline) and `migrations/` (everything since). |

Forms use react-hook-form, with the rules themselves written in zod under `models/` so they can be tested without React.

## Design system & accessibility

The full design plan, UX audit, user journey, and rationale are in [docs/design-system.md](docs/design-system.md). In short:

- **Look and feel.** Familiar iOS patterns that also work on Android: a bottom tab bar with icons, native large-title headers on iOS (a standard top bar on Android), grouped lists, native sheets for forms and the trip switcher, and system confirmations (action sheets on iOS, dialogs on Android) for destructive actions. Midnight & Sunset palette: navy carries the identity (icon, trip hero card) and sunset orange is used only for things you can tap, selection, and the Route.
- **Signature element: the Route.** A dotted sunset-orange line with round stops. It links each day's activities on the Itinerary, shows trip progress on Home, and leads into the Pin & Crew mark (a map pin holding three dots, one per person) in the app icon, splash screen, and empty states.
- **Tokens.** Everything visual comes from `theme/theme.ts`. Colors follow the system light or dark setting; there's deliberately no in-app switch. When the system asks for more contrast (Increase Contrast on iOS, High contrast text on Android), secondary text and separators get stronger.
- **Icons.** Ionicons from `@expo/vector-icons`, through `components/Icon.tsx`. No Apple logos, trademarks, or SF Symbols artwork. The app icon is original; regenerate it with `python scripts/make-icons.py`.

Accessibility commitments, checked before each release:

| Area | What the app does |
| --- | --- |
| Text size | All text uses the token type styles and scales with the system setting. Rows, headers, and segmented controls stack vertically at accessibility sizes (`useLargeText`). Icons grow with the text. Only bar labels (tab bar, header buttons) are capped, at 1.4–1.5x, because the system fixes their height. |
| Contrast | Every text pair meets WCAG AA (4.5:1) and every control outline 3:1, in light and dark. Run `npm run check:contrast` after changing a color. |
| Touch targets | Every interactive element is at least 44 x 44 pt. |
| Screen readers | Every control has `accessibilityRole` and a label; icon-only buttons are labeled; decorative graphics are hidden; headings are marked; field errors are announced and repeated when you return to the field; itinerary rows offer "Move earlier / Move later" actions. |
| Color alone | Errors, offline, today, and the current trip always have an icon, a badge, or words as well as color. |
| Motion | Only the Route fill-in on Home and the loading-skeleton pulse animate. Both stop when Reduce Motion is on. |

## Offline behavior

Trips (and which one is open) and each trip's itinerary are saved on the device per user and shown immediately at launch, then replaced with fresh data. A banner shows while the device has no connection, and data reloads when it returns. Edits made offline are rejected with a clear message rather than queued. Signing out erases the saved data.

## Database schema

All ids are `uuid`. Dates are `date`; money is stored as integer cents.

### `profiles`
One row per user, created automatically by a trigger when they sign up. Holds the name other trip members see.

| Column | Notes |
| --- | --- |
| `id` | Primary key, references `auth.users`; deleted with the user |
| `display_name` | 1–50 characters, optional |
| `created_at` | |

### `trips`

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `name` | 3–50 characters |
| `destination` | The trip's location |
| `start_date`, `end_date` | `end_date` may not be before `start_date` |
| `budget_cents` | `>= 0`; 0 means no budget set |
| `invite_code` | Unique; exactly 6 uppercase letters/digits. How people join. |
| `created_at` | |

### `trip_members`
Who is on which trip. Primary key `(trip_id, user_id)`.

| Column | Notes |
| --- | --- |
| `trip_id` | References `trips`; rows are deleted with the trip |
| `user_id` | References `profiles`; rows are deleted with the user |
| `role` | `organizer` or `member` |

### `itinerary_items`
One activity on one day of a trip.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `trip_id` | References `trips`; deleted with the trip |
| `day` | Must fall within the trip's dates (enforced by a trigger) |
| `title` | 1–100 characters |
| `time` | Optional start time |
| `location` | Optional, up to 120 characters |
| `notes` | Optional, up to 1000 characters |
| `sort_order` | Position within the day, 1 = first |
| `created_by` | Defaults to the signed-in user; references `auth.users` |
| `created_at` | |

### `expenses`
Reserved for the Budget feature (not built yet). Belongs to a trip; deleted with it.

### Functions

| Function | What it does |
| --- | --- |
| `create_trip(...)` | Creates a trip and records the caller as its organizer in one transaction. Raises `unique_violation` if the invite code is taken (the app retries with a new code). |
| `join_trip_by_code(code)` | Finds the trip by invite code and adds the caller as a `member`. Raises `invite_not_found` or `already_member`. |
| `reorder_itinerary_items(trip, day, ids[])` | Saves one day's order atomically. Runs as the caller, so the itinerary policies still apply. |
| `is_trip_member(trip)`, `is_trip_organizer(trip)`, `shares_trip_with(user)` | Helpers used by the policies. They are `SECURITY DEFINER` because a policy that queries `trip_members` directly would recurse forever. |

Signed-out visitors cannot call any of these.

## Row Level Security

Rule of thumb: **you can only see and change trips you are a member of; only an organizer can edit or delete a trip; any member can plan the itinerary.** RLS is enabled on every table, and the `anon` role (not signed in) has no access to any of them.

Policies are defined, with comments, in `supabase/migrations/004_access_control.sql`.

### `profiles`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | You, and anyone who shares a trip with you | Read own profile and profiles of people on your trips |
| Update | You, `display_name` only | Update own profile |
| Insert | Nobody directly | Created by the signup trigger |

### `trips`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members | Members can read their trips |
| Update | Organizers; only name, destination, dates and budget (never `invite_code`) | Organizers can edit their trips |
| Delete | Organizers | Organizers can delete their trips |
| Insert | Nobody directly | Use `create_trip()` |

### `trip_members`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members see the whole roster of their trips | Members can see who is on their trips |
| Delete | You (leave a trip) or an organizer (remove someone) | Leave a trip, or organizers remove members |
| Insert / update | Nobody directly | Use `create_trip()` and `join_trip_by_code()` |

### `itinerary_items`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members | Members can read their trip's itinerary |
| Insert | Members, as themselves (`created_by` must be you) | Members can add itinerary items as themselves |
| Update | Any member; only `day`, `title`, `time`, `location`, `notes`, `sort_order` (an item can't be moved to another trip or re-attributed) | Members can edit and reorder itinerary items |
| Delete | The member who added it, or an organizer | Authors and organizers can delete itinerary items |

### `expenses`

| Operation | Who | Policy |
| --- | --- | --- |
| All | Members of the trip | Members have full access to their trip's expenses |

### Why invites go through a function

A person who isn't on a trip yet can't read it, so the app can't look up a trip by invite code with a normal query. `join_trip_by_code()` does the lookup with elevated rights and adds the member itself. The same reasoning applies to `create_trip()`: with no direct insert on `trips` or `trip_members`, the trip and its organizer row have to be written together.

Invite codes are 6 characters from a 31-character alphabet (about 887 million combinations) and there is currently no rate limiting on join attempts. Lengthen the code (`INVITE_CODE_LENGTH` in `utils/inviteCode.ts`, plus the check in `002_trip_constraints.sql`) if that matters for your use.

### Changing a policy

Add a new numbered migration rather than editing an old one, and keep the explanatory comment next to each policy. After changing access rules, re-test with at least two accounts: one on the trip, one outside it.
