---
tags: [triphub, presentation]
created: 2026-10-25
---
# Known limits (say them before a judge finds them)

Taken from the weakness list in [[self-assessment]]. Answer plainly; each has a reason.

- **Reminders and alerts are local.** They fire while TripHub is installed/running on that phone; real push needs a server function.
- **No in-app account deletion or display-name change.** Planned next; data is removed with the account at the database level (cascades).
- **Offline cache is not encrypted.** It holds trip data, never passwords; cleared on sign-out.
- **Offline writes are refused**, by design ([[decisions]]).
- **Settle-up payments are recorded, not processed.** TripHub tracks who paid whom; it never moves money.
- **`npm audit` advisories** come from upstream Expo/RN toolchain packages, not TripHub code; forcing fixes would break the SDK.
- **React Navigation, not Expo Router.** Not a rating-sheet item; switching late is risky.
- **Not yet device-tested** until [[human-todo]] sections B to D are done. Update this note when they are.
