---
tags: [triphub, presentation, qa]
created: 2026-10-25
---
# Q&A cheat sheet (3 minutes)

Short, honest answers. Details live in the linked notes. Related: [[demo-script]], [[decisions]], [[architecture]], [[known-limits]].

- **Why Expo / React Native / Supabase?** One TypeScript codebase for iOS and Android; hosted Postgres with auth, realtime and Row Level Security ([[decisions]]).
- **Why this architecture?** MVVM: rules (splits, validation, settle-up) are pure models testable without React or a network; providers are the view models; services are the only code touching Supabase or the device ([[architecture]]).
- **How is data secured?** RLS on every table, tested in an in-memory Postgres; joining goes through a database function so outsiders can't read trips; only the anon key ships in the app; per-user cache cleared on sign-out.
- **How does settle-up work?** Balance = paid minus owed, in integer cents. Finds the fewest payments by searching for zero-sum groups; each group of k people needs k-1 payments. "Mark as paid" records a payment that is added to the balances.
- **Why integer cents?** No floating-point drift; every split sums exactly to the total.
- **What happens offline?** Saved data is readable and the budget math runs on the phone; edits are refused with a clear message, not queued (avoids conflicts).
- **Validation?** Twice: zod in the app (syntax and meaning) and constraints/triggers in Postgres, so rules hold if the app is bypassed.
- **Accessibility?** Screen-reader labels, 44 pt targets, large-text layouts, contrast checked in light and dark, color never the only signal.
- **What's innovative?** Live sync across phones, fewest-payments settle-up, paste-a-list quick add, join links that survive sign-up.
- **Push notifications?** Alerts and reminders are local today; real push needs a server function ([[known-limits]]).
- **Social media?** WhatsApp, X, Messages and the share sheet open with the message filled in; posts never include the invite code.
- **What would you do next?** Account deletion in-app, push notifications, encrypted offline cache.
