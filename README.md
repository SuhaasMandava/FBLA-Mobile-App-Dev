# TripHub

TripHub is a group trip planner built with Expo and React Native. People sign up, create or join a trip with an invite code, plan its itinerary together, share a packing list and to-do checklist, and track what the group spends, with a settle-up that works out who owes whom in the fewest payments. Data lives in Supabase.

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
npm test           # unit tests (Jest): models, validation, links, dates
npm run test:db    # database rules: runs every migration in an in-memory Postgres and checks RLS as several users
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
| `models/` | Plain data types, row mapping, and rules. Validation lives here as zod schemas (`TripForm`, `ItineraryForm`, `ExpenseForm`, `ChecklistForm`, `MessageForm`, `AuthForm`); the money math (splits, budget summary, settle-up) is `BudgetCalculator`. No React, no network. Unit tests sit next to them in `models/__tests__/`. |
| `services/` | Everything that talks to Supabase or the device: `TripService`, `ExpenseService`, `ChecklistService`, `CommunicationService`, `AuthService`, `CacheService`, `NetworkService`, `ShareService` (system share sheet, WhatsApp, Messages and X links), `NotificationService` (local reminders and alerts), `RealtimeService` (live updates). They throw typed errors with user-safe messages. |
| `context/`, `hooks/` | App state (auth, trips, itinerary, expenses, checklist, messages, network, theme) and the form hooks that tie react-hook-form to the models and services. |
| `theme/` | Design tokens (`theme.ts`): colors for light and dark, type roles, spacing, radii, motion. Read through `useTheme()`. |
| `screens/`, `components/` | Presentation only. Navigation is React Navigation (`App.tsx` → `screens/RootNavigator.tsx`). Screens are built from the shared components; none defines its own button, row, or field styles. |
| `scripts/` | `check-contrast.js` (WCAG check of the color tokens) and `make-icons.py` (builds the app icon, Android icon layers, splash, and favicon from `assets/TripHub Icon.jpg`). |
| `supabase/` | `schema.sql` (baseline) and `migrations/` (everything since). |

Forms use react-hook-form, with the rules themselves written in zod under `models/` so they can be tested without React.

## Budget and settle-up

The Budget tab shows what the active trip has spent against its budget (with how much is left, or how far over it is), who owes whom, and every expense.

- **Expenses.** Description, amount, category, who paid, and how it's split: **evenly** among the people you pick, or **by shares** (a couple takes 2). Each person's amount previews as you type, and the sheet warns before an expense takes the trip over budget.
- **Exact money.** Amounts are integer cents. A split always adds up to exactly the expense; leftover cents go to the largest remainders, ties in roster order (`BudgetCalculator.splitByShare`).
- **Settle-up in the fewest payments.** Each person's balance is what they paid minus what they owe. People can always settle in one fewer payment than there are people with a balance, and every group within them whose balances cancel out saves one more. `BudgetCalculator.settleUp` searches for the largest number of such groups exactly (fine for groups up to 15 people; larger groups fall back to pairing the largest debtor with the largest creditor), then settles each group. The tests include a case where the simple pairing needs 4 payments and TripHub needs 3.
- **Who can change what.** You log what you paid; an organizer can log an expense for anyone. Only whoever paid, or an organizer, can edit or delete it. The app hides editing from everyone else, and the database enforces the same rule (see `expenses` below).
- **Validation.** Syntactic: description required and under 80 characters, an amount like `42.50`, whole-number shares from 0 to 99. Semantic: more than $0 and at most $1,000,000, the payer and everyone in the split are on the trip, and at least one person shares the cost. The database checks the split again with a trigger.

## Checklist

The Checklist tab is one shared list per trip, in three groups: **Packing**, **To-Do** and **Bookings**. A header card shows progress ("5 of 12 done"), and each group shows its own count.

- **Everyone sees the same list.** Items live in the database, so any member can add an item, tick it off, rename it, move it to another group, assign it to a member, or reopen it. Pull down to refresh; it also reloads when the connection returns. Open items sit above finished ones.
- **Who did it.** A finished item says "Done by Alex". The database records who ticked it and when (from the caller's own id, in a trigger), so nobody can tick an item on someone else's behalf.
- **Who can delete.** The member who added an item, or a trip organizer, like the itinerary. The app only offers Delete to them.
- **Ticking is instant.** The check appears straight away and is put back, with a message, if it can't be saved.
- **Quick add.** The box under the progress card adds items fast: pick Packing, To-Do or Bookings once, then type an item and press return, again and again (the keyboard stays up). Pasting a list adds one item per line, with bullets, numbers and checkboxes stripped and repeats skipped, up to 25 at a time. If one can't be saved, what wasn't added stays in the box.
- **Validation.** Syntactic: a name is required and at most 100 characters, and the group is one of the three. Semantic: the assignee must be a member of the trip (an item assigned to someone who later leaves shows as assigned to "a former member" and can still be ticked or reassigned). The database checks the same rules with constraints and a trigger.

## First run

A three-step intro (`screens/WelcomeScreen.tsx`) opens the first time the app is launched on a phone, before signing in: plan the trip together, invite with a code, and how friends join (typing the code or opening the link). **Skip** or **Get Started** goes to sign-in, and it isn't shown again on that phone. **Settings → How TripHub Works** replays it.

## Organizer tools

**Trip Settings** (from the bottom of Home, or Settings → Current Trip) shows the trip's details and members.

- **Edit the trip** (organizers). Name, destination, dates and budget, with the same rules as creating a trip, plus two more: a trip that has already started keeps its start date (only a *new* start date can't be in the past), and the dates must still cover every planned activity. The database checks the second rule too.
- **Manage members** (organizers). Tap someone to **Make Organizer** or **Remove from Trip**. Screen-reader users get both as actions on the row.
- **Leave the trip** (anyone). Every trip keeps at least one organizer, so the last organizer is told to make someone else organizer first, or delete the trip.
- **Delete the trip** (organizers). Removes it for everyone, along with its itinerary, expenses, checklist and messages.
- **Confirmation and safety.** Every one of these asks first and says what will happen. They need a connection (and say so offline). Leaving or deleting also clears that trip's saved data from the phone. Expenses logged by someone who leaves stay in the budget, shown as "Former member".

## Announcements and comments

Two lightweight ways for the group to talk, both stored per trip in the database.

- **Announcements.** Organizers post updates for everyone (meeting times, changes, reminders). Home shows the latest one; **Announcements** lists them all, newest first, with the composer at the bottom for organizers. Members read them.
- **Comments on activities.** Every itinerary activity has a comment thread. The bubble button on each activity on the Itinerary shows how many comments it has and opens the thread; any member can comment.
- **Who can delete.** An announcement: any organizer. A comment: whoever wrote it, or an organizer. Nothing is ever edited: post a correction instead. The app only shows Delete to people allowed to use it, and the database enforces the same rules (see `trip_announcements` and `activity_comments` below).
- **Validation.** Syntactic: some text, at most 500 characters (line endings tidied and runs of blank lines collapsed first). Semantic: only an organizer can post an announcement, and a comment's activity must still exist. The database checks the length again and works out a comment's trip from its activity, so a comment can't be attached to a trip you aren't on.
- **Offline.** Messages are saved on the phone with everything else and readable offline; posting needs a connection and says so up front.

## Sharing and invite links

- **Invite by link.** Every invite carries a link, `triphub://join/CODE`, along with the code itself. Opening the link opens TripHub's **Join Trip** sheet with the code filled in; the person still taps **Join Trip** to join. If nobody is signed in yet, the sign-in screen says there's an invite waiting and the Join sheet opens right after signing in or creating an account. A link for a trip you're already on offers **Open Trip** instead. Malformed links are ignored (`utils/inviteLink.ts`).
- **Straight to the app.** Home's Invite Friends card has **Share Invite Code** (the system share sheet) plus **WhatsApp** and **Text** buttons that open those apps with the invite ready to send. **Post on X** under *Share the Trip* starts a public post about the trip; it never includes the invite code, so strangers can't join from it.
- **When the app isn't there.** TripHub tries the app first and then a web link that opens the app or its website (`wa.me`, `twitter.com/intent/tweet`), so a missing WhatsApp or X never dead-ends. A device that can't send texts (an iPad, a simulator) gets a message pointing to the share sheet instead. No URL schemes need declaring, because the app never asks `canOpenURL`.
- **Trying a link while developing.** `triphub://` links need a development or preview build (the scheme is set in `app.json`). In Expo Go, use the Expo form of the link instead, replacing the address with the one `npx expo start` prints:

  ```bash
  npx uri-scheme open "exp://192.168.1.5:8081/--/join/K7M9PQ" --android
  ```

  With a build installed, `npx uri-scheme open "triphub://join/K7M9PQ" --ios` (or `--android`) opens it directly.

## Design system & accessibility

The full design plan, UX audit, user journey, and rationale are in [docs/design-system.md](docs/design-system.md). In short:

- **Look and feel.** Familiar iOS patterns that also work on Android: a bottom tab bar with icons, native large-title headers on iOS (a standard top bar on Android), grouped lists, native sheets for forms and the trip switcher, and system confirmations (action sheets on iOS, dialogs on Android) for destructive actions. Midnight & Sunset palette: navy carries the identity (icon, trip hero card) and sunset orange is used only for things you can tap, selection, and the Route.
- **Signature element: the Route.** A dotted sunset-orange line with round stops. It links each day's activities on the Itinerary, shows trip progress on Home, and appears as the trail of dots leading to the pin in the app icon, splash screen, and empty states.
- **Tokens.** Everything visual comes from `theme/theme.ts`. Colors follow the system light or dark setting by default; Settings → Appearance can pin the app to Light or Dark instead. When the system asks for more contrast (Increase Contrast on iOS, High contrast text on Android), secondary text and separators get stronger.
- **Icons.** Ionicons from `@expo/vector-icons`, through `components/Icon.tsx`. No Apple logos, trademarks, or SF Symbols artwork. The app icon is the team's own artwork (`assets/TripHub Icon.jpg`); rebuild every icon size from it with `python scripts/make-icons.py`.

Accessibility commitments, checked before each release:

| Area | What the app does |
| --- | --- |
| Text size | All text uses the token type styles and scales with the system setting. Rows, headers, and segmented controls stack vertically at accessibility sizes (`useLargeText`). Icons grow with the text. Only bar labels (tab bar, header buttons) are capped, at 1.4–1.5x, because the system fixes their height. |
| Contrast | Every text pair meets WCAG AA (4.5:1) and every control outline 3:1, in light and dark. Run `npm run check:contrast` after changing a color. |
| Touch targets | Every interactive element is at least 44 x 44 pt. |
| Screen readers | Every control has `accessibilityRole` and a label; icon-only buttons are labeled; decorative graphics are hidden; headings are marked; field errors are announced and repeated when you return to the field; itinerary rows offer "Move earlier / Move later" actions. |
| Color alone | Errors, offline, today, and the current trip always have an icon, a badge, or words as well as color. |
| Motion | Only the Route fill-in on Home and the loading-skeleton pulse animate. Both stop when Reduce Motion is on. |

## Live updates

The itinerary, expenses, checklist, announcements and comments of the open trip update by themselves when someone else changes them, using Supabase Realtime (`hooks/useLiveSync.ts`, `services/RealtimeService.ts`). Nobody has to pull to refresh.

- **Only your trips.** Each list listens to its own trip only, and Supabase checks the same read policies before sending a row, so no one receives another trip's data. Deleted rows arrive as just an id, and the app removes an id only if it's showing it.
- **Your own changes** are shown as soon as the server confirms them; when their echo arrives it just replaces the same row. A checklist tick still being saved isn't overwritten by an older echo.
- **Falling back.** Offline, the app stops listening and shows what's saved (see below). When the connection comes back, every list reloads and live updates resume. A reload also runs when live updates recover after an outage and when the app comes back to the foreground, since a phone pauses connections in the background. If Realtime can't be used at all (switched off for the project, or `009_live_sync.sql` not run), the app behaves exactly as before: pull to refresh, and reload on reconnect.
- **Setup.** Running `009_live_sync.sql` adds the five tables to the `supabase_realtime` publication. Nothing else is needed.

## Reminders

Local notifications, scheduled by the phone itself (`services/NotificationService.ts`, rules in `models/ReminderModel.ts`):

- **Activity reminders.** 30 minutes before every activity on the open trip that has a start time. They're rescheduled automatically when an activity is added, retimed, renamed, moved or deleted, including by someone else (live updates), and cleared when you leave or delete the trip, sign out, or turn them off. At most 20 per trip are kept scheduled (iOS allows 64 pending notifications per app).
- **New-expense alerts.** When someone else on the trip logs an expense while TripHub is open or running: "Sam paid $42.50 for Dinner." Your own expenses never alert you.
- **Settings → Reminders** has a switch for each. Both start on, but nothing appears until the phone grants permission: TripHub asks the first time you save an activity with a start time (or turn a switch on, or tap **Allow Notifications**). If notifications are off for TripHub in the phone's settings, the screen says so and links there.
- **Where they work.** In development, preview and store builds. Expo Go (SDK 53 and later) and the web don't support them, so there the switches are disabled with an explanation. Reminders for a trip are refreshed whenever that trip is open. Alerts while the app is fully closed would need server push notifications, which TripHub doesn't use.

## Offline behavior

Trips (and which one is open) and each trip's itinerary, expenses, checklist, announcements and comments are saved on the device per user and shown immediately at launch, then replaced with fresh data. The budget summary and settle-up are worked out on the phone, so they're readable offline too. A banner shows while the device has no connection, and data reloads when it returns. Edits made offline are rejected with a clear message rather than queued (expense, checklist and message changes say so straight away, without waiting for the request to fail). Signing out erases the saved data.

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
One thing the group paid for. Tightened in `005_expenses.sql`.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `trip_id` | References `trips`; deleted with the trip |
| `paid_by` | References `profiles`; must be a member of the trip (trigger) |
| `description` | 1–80 characters |
| `amount_cents` | More than 0, at most 100,000,000 ($1,000,000) |
| `category` | `lodging`, `food`, `transport`, `activities`, `shopping` or `other` |
| `splits` | JSON object: member user id → cents they owe. Whole, non-negative cents, only trip members, adding up to exactly `amount_cents` (trigger) |
| `shares` | JSON object of weights 0–99 when split by shares; `NULL` when split evenly |
| `created_at` | |

### `checklist_items`
One item on a trip's shared checklist. Added in `006_checklist.sql`.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `trip_id` | References `trips`; deleted with the trip |
| `title` | 1–100 characters |
| `category` | `packing`, `todo` or `booking` |
| `assigned_to` | Optional; references `profiles`. Must be a member of the trip when set or changed (trigger); cleared if that account is deleted |
| `done` | Whether it has been ticked off |
| `completed_by`, `completed_at` | Who ticked it and when. Set by the trigger from the caller's id; the app cannot write them |
| `created_by` | Defaults to the signed-in user; references `auth.users` |
| `created_at` | |

### `trip_announcements`
An update an organizer posted to the whole trip. Added in `007_communication.sql`.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `trip_id` | References `trips`; deleted with the trip |
| `body` | 1–500 characters |
| `created_by` | Defaults to the signed-in user (the app can't set it); references `auth.users` |
| `created_at` | Set by the database |

### `activity_comments`
A comment on an itinerary activity. Added in `007_communication.sql`.

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `item_id` | References `itinerary_items`; deleted with the activity |
| `trip_id` | Copied from the activity by a trigger (the app can't set it), so policies can filter by trip |
| `body` | 1–500 characters |
| `created_by` | Defaults to the signed-in user (the app can't set it); references `auth.users` |
| `created_at` | Set by the database |

### Functions

| Function | What it does |
| --- | --- |
| `create_trip(...)` | Creates a trip and records the caller as its organizer in one transaction. Raises `unique_violation` if the invite code is taken (the app retries with a new code). |
| `join_trip_by_code(code)` | Finds the trip by invite code and adds the caller as a `member`. Raises `invite_not_found` or `already_member`. |
| `reorder_itinerary_items(trip, day, ids[])` | Saves one day's order atomically. Runs as the caller, so the itinerary policies still apply. |
| `check_expense_splits()` | Trigger on `expenses`: the payer and everyone in the split are on the trip, and the split adds up to the amount. Raises `payer_not_member`, `split_member_not_on_trip`, `splits_total_mismatch` or `invalid_splits`. |
| `check_checklist_item()` | Trigger on `checklist_items`: an assignee must be on the trip (checked when set or changed), and `completed_by` / `completed_at` follow `done` and the caller. Raises `assignee_not_member`. |
| `make_trip_organizer(trip, user)` | Organizers only: makes another member an organizer. Raises `not_permitted` or `member_not_found`. |
| `keep_an_organizer()` | Trigger on `trip_members`: refuses to remove a trip's last organizer (`last_organizer`), except when the whole trip or the person's account is being deleted. |
| `check_trip_dates_cover_itinerary()` | Trigger on `trips`: new dates must still include every activity's day (`activities_outside_dates`). |
| `set_activity_comment_trip()` | Trigger on `activity_comments`: fills in the comment's trip from its activity. Raises `activity_not_found` if the activity is gone or not on one of your trips. |
| `is_trip_member(trip)`, `is_trip_organizer(trip)`, `shares_trip_with(user)` | Helpers used by the policies. They are `SECURITY DEFINER` because a policy that queries `trip_members` directly would recurse forever. |

Signed-out visitors cannot call any of these.

## Row Level Security

Rule of thumb: **you can only see and change trips you are a member of; only an organizer can edit or delete a trip; any member can plan the itinerary, share the checklist and comment on activities; only organizers post announcements; only whoever paid, or an organizer, can change an expense.** RLS is enabled on every table, and the `anon` role (not signed in) has no access to any of them.

Policies are defined, with comments, in `supabase/migrations/004_access_control.sql`, and for later features in `005_expenses.sql` (expenses), `006_checklist.sql` (checklist), `007_communication.sql` (announcements and comments) and `008_organizer_tools.sql` (organizer rules). `npm run test:db` checks them.

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
| Delete | You (leave a trip) or an organizer (remove someone), but never the trip's last organizer (trigger, `008_organizer_tools.sql`) | Leave a trip, or organizers remove members |
| Insert / update | Nobody directly | Use `create_trip()`, `join_trip_by_code()` and `make_trip_organizer()` |

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
| Read | Members | Members can read their trip's expenses |
| Insert | Members, for an expense they paid; organizers, for anyone | Members log what they paid; organizers log for anyone |
| Update | Whoever paid, or an organizer; only `paid_by`, `description`, `amount_cents`, `category`, `splits`, `shares` (an expense can't move to another trip). A member can't hand an expense to someone else. | Payers and organizers can edit expenses |
| Delete | Whoever paid, or an organizer | Payers and organizers can delete expenses |

### `checklist_items`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members | Members can read their trip's checklist |
| Insert | Members, as themselves (`created_by` must be you) | Members can add checklist items as themselves |
| Update | Any member; only `title`, `category`, `assigned_to`, `done` (an item can't move to another trip, and the completion stamp is the database's) | Members can edit checklist items |
| Delete | The member who added it, or an organizer | Authors and organizers can delete checklist items |

### `trip_announcements`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members | Members can read their trip's announcements |
| Insert | Organizers, as themselves; only `trip_id` and `body` can be sent | Organizers can post announcements as themselves |
| Update | Nobody | — |
| Delete | Organizers | Organizers can delete announcements |

### `activity_comments`

| Operation | Who | Policy |
| --- | --- | --- |
| Read | Members | Members can read their trip's comments |
| Insert | Members, as themselves; only `item_id` and `body` can be sent | Members can comment as themselves |
| Update | Nobody | — |
| Delete | Whoever wrote it, or an organizer | Authors and organizers can delete comments |

### Why invites go through a function

A person who isn't on a trip yet can't read it, so the app can't look up a trip by invite code with a normal query. `join_trip_by_code()` does the lookup with elevated rights and adds the member itself. The same reasoning applies to `create_trip()`: with no direct insert on `trips` or `trip_members`, the trip and its organizer row have to be written together.

Invite codes are 6 characters from a 31-character alphabet (about 887 million combinations) and there is currently no rate limiting on join attempts. Lengthen the code (`INVITE_CODE_LENGTH` in `utils/inviteCode.ts`, plus the check in `002_trip_constraints.sql`) if that matters for your use.

### Changing a policy

Add a new numbered migration rather than editing an old one, and keep the explanatory comment next to each policy. After changing access rules, add checks to `scripts/test-database.mjs` and run `npm run test:db`, then re-test in the app with at least two accounts: one on the trip, one outside it.
