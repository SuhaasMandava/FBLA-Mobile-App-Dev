# Requirements map

How each part of the 2026–2027 FBLA Mobile Application Development topic, **"Together We Go: Group Trip Planner"**, and each item on the event's rating sheet is met, and where to see it. The topic and rating sheet are FBLA's ([event page](https://www.fbla.org/competitive-events/mobile-application-development/)); they're summarized here, not reproduced.

## The prompt

The topic asks for a mobile app that helps a group organize and manage a shared trip from planning through completion, supporting collaboration, communication, scheduling, budgeting, organization and trip management for multiple users, and asks how the app makes a group trip easier, more organized and more collaborative.

| Prompt area | Feature | Where in the app | Where in the code | Proof |
| --- | --- | --- | --- | --- |
| Multiple users | Accounts; trips with organizer and member roles; invite codes; join links | Sign in, Join Trip, Trip Settings | `AuthService`, `TripService`, `004_access_control.sql`, `utils/inviteLink.ts` | `AuthForm.test.ts`, `TripForm.test.ts`, `inviteLink.test.ts`, `npm run test:db` |
| Collaboration | Shared itinerary and checklist anyone on the trip can change; live updates between phones | Itinerary, Checklist | `ItineraryContext`, `ChecklistContext`, `useLiveSync`, `009_live_sync.sql` | `ChecklistModel.test.ts`, `LiveChange.test.ts`; two-phone tests |
| Communication | Organizer announcements; comments on each activity; alerts for new expenses | Home, Announcements, Comments | `CommunicationContext`, `CommunicationService`, `007_communication.sql` | `CommunicationModel.test.ts`, `MessageForm.test.ts`, `npm run test:db` |
| Scheduling | Day-by-day itinerary within the trip dates, reorder, Coming Up, reminders | Itinerary, Home | `ItineraryModel`, `ItineraryForm`, `useActivityReminders`, `NotificationService` | `dates.test.ts`, `ReminderModel.test.ts` |
| Budgeting | Budget, expenses split evenly or by shares in integer cents, settle-up in the fewest payments | Budget | `BudgetCalculator`, `ExpenseForm`, `005_expenses.sql` | `BudgetCalculator.test.ts`, `ExpenseForm.test.ts` |
| Organization | Checklist in Packing / To-Do / Bookings with assignees, "done by", progress, quick add | Checklist | `ChecklistModel`, `ChecklistForm`, `006_checklist.sql` | `ChecklistForm.test.ts`, `QuickAdd.test.ts` |
| Trip management | Edit or delete a trip, make organizers, remove members, leave; several trips with a switcher | Trip Settings, Trip switcher | `useTripManagement`, `TripForm` (edit rules), `008_organizer_tools.sql` | `TripModel.test.ts`, `TripForm.test.ts`, `npm run test:db` |
| Planning through completion | Trip progress on Home; reminders during the trip; settle-up after it | Home, Budget | `utils/tripProgress.ts`, `BudgetCalculator.settleUp` | `BudgetCalculator.test.ts` |
| Easier, more organized, more collaborative | One place for plans, money, lists and messages; works offline; first-run intro | Everywhere | `CacheService`, `WelcomeScreen` | Offline and first-run test steps |

## The rating sheet

| Rating sheet item | How TripHub meets it | Evidence to show judges |
| --- | --- | --- |
| **Planning process** (tangible planning documents, industry terms) | Iterations with a definition of done; timeline; wireframes; user journey; this map; design system and UX audit | [timeline.md](timeline.md), [wireframes.md](wireframes.md), this file, [design-system.md](../design-system.md) |
| **Classes, modules, components** | Typed models, one service per backend area, reusable components (Button, ListRow, Sheet, MessageRow, SwitchRow…) on design tokens | `models/`, `services/`, `components/` |
| **Mobile architectural pattern** | MVVM: screens (View), context providers and hooks (ViewModel), models (Model), services | README → Architecture (MVVM) diagram |
| **Innovation and creativity** | Live sync across phones, fewest-payments settle-up, paste-a-list quick add, join links that survive sign-up, the Route motif in the icon and screens | Demo steps 3–5 |
| **UX design: journey, rationale, accessibility** | User journey; design rationale; screen-reader labels and actions, 44 pt targets, large-text layouts, contrast checked in light and dark | [wireframes.md](wireframes.md), [design-system.md](../design-system.md), `npm run check:contrast` |
| **Intuitive, or clear instructions** | First-run intro and Settings → How TripHub Works; empty states that say what to do next; inline help under fields | Intro, empty Checklist and Itinerary |
| **Icons and graphics** | The team's Pin & Orbit icon, used in the splash, empty states and as the Route through the app | `assets/`, `components/Route.tsx` |
| **Input validation, syntactic and semantic** | Every form has both, in zod, repeated in the database: e.g. amounts like `42.50` (syntax) and a split that adds up to the expense with everyone on the trip (semantics); trip dates that still cover every activity | `models/*Form.ts` and their tests; triggers in migrations |
| **Addresses all parts of the prompt** | Table above; explained in the README and the intro | README → How TripHub answers the prompt |
| **Social media** | WhatsApp and X work directly with the apps (prefilled message or post), plus Messages and the system share sheet; posts never include the invite code | Home → Invite Friends and Share the Trip; `ShareService`, `shareTargets.test.ts` |
| **Data handling and storage** | Row Level Security on every table; column grants; triggers stamp authors and check rules; integer cents; offline cache per user, cleared on sign-out and when leaving a trip; anon key only in the app | README → Row Level Security; `npm run test:db` |
| **Documentation and copyright** | README, credits and licenses for every dependency, icon and trademark; sources cited | README → Credits and licenses |
| **Presentation delivery, Q&A, protocols** | 7-minute demo plan; offline backup plan for venue internet; no QR codes for judges to scan | README → Demo steps |
