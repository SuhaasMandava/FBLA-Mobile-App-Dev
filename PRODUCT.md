# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

A friend or family group planning one shared trip, on their own phones. One person (the organizer) creates the trip and shares an invite code; the others join as members. They are not travel professionals: they are busy people who currently scatter a trip across group chats, spreadsheets and payment apps. Secondary audience: FBLA Mobile Application Development judges, who see the app in a 7-minute live demo on two phones and a laptop.

## Product Purpose

TripHub ("Together We Go: Group Trip Planner") is an entry for the FBLA Mobile Application Development event. It helps a group organize a shared trip from first idea to last stop: a shared itinerary, a budget with expense splitting and settle-up, a packing/to-do checklist, announcements and activity comments, and sharing/invites. Success means the group needs one app instead of several, and the entry scores well on the event's rating sheet (planning, architecture, UX and accessibility, completeness against the prompt, documentation, presentation).

## Positioning

Planning, communication and money in one place, kept live across everyone's phones: changes appear without refreshing, expenses split in exact integer cents, settle-up finds the fewest payments (and payments can be marked as paid until balances reach zero), and join links survive sign-up. Security lives in the database (Row Level Security), not just the app.

## Operating Context

- Built with Expo SDK 58 / React Native 0.88, React Navigation (not Expo Router), Supabase (Postgres, Auth, Realtime). MVVM layers: `screens/`, `components/`, `context/`, `hooks/`, `models/`, `services/`, `utils/`.
- Used on phones at the destination and in the demo room, sometimes offline or on a phone hotspot. Reads work offline; offline writes are refused with a clear message, not queued.
- Reminders and alerts are local notifications (need a preview or dev build, not Expo Go).
- Notes and decisions live in the Obsidian vault in `docs/` (start at `docs/index.md`). The vault root is `docs/`, so Obsidian MCP paths are `index.md`, not `docs/index.md`. Design work should read it through the Obsidian MCP (`mcp__obsidian__*`): `index.md` first, then `design-system.md` (search it, don't read it whole), `architecture.md`, `conventions.md`, `gotchas.md` and `planning/bug-list-2026-10-25.md`. When design work changes behavior or decisions, record it there (`current-work.md`, `decisions.md`, `gotchas.md`).

## Capabilities and Constraints

- Features: trips with invite codes and roles (organizer/member), itinerary with reorder and reminders, budget with split evenly or by shares, settle-up and Mark as paid, Trip Summary, checklist with quick add, announcements, activity comments, WhatsApp/X/Messages sharing, live sync, organizer tools, first-run intro, per-user offline cache.
- Money is integer cents. Validation happens twice (zod in the app, constraints and triggers in Postgres).
- Terms used in the product: trip, organizer, member, crew, itinerary, settle up, Mark as paid.
- FBLA rules: original work with credits for third-party content; no QR codes or links for judges to open; at most three devices (two phones and a laptop) at the event.
- Undecided/not built: real push notifications, in-app display-name change and account deletion, invite-code attempt limits, end-to-end device testing.

## Brand Commitments

Name: TripHub. The team's own icon and the "Route" motif (a path with stops) are already in the app; licensed to the TripHub team (`LICENSE`). Voice is plain and friendly, written for non-experts. A visual identity exists in `theme/theme.ts` and `docs/design-system.md`; this file does not redefine it.

## Evidence on Hand

- Working app with 244 passing unit tests, an in-memory Postgres test of every database rule (`npm run test:db`), WCAG contrast check (`npm run check:contrast`).
- Demo seed trip (`supabase/seed/demo_trip.sql`), README demo script, and planning docs: timeline, wireframes, requirements map, self-assessment (`docs/planning/`).
- Absent, and not to be invented: real-user usability results, testimonials, device-test results, customers, benchmarks.

## Product Principles

1. **One place beats five apps.** Every feature should remove a trip chore from a group chat or spreadsheet.
2. **Everyone sees the same trip, now.** Shared state stays live and consistent across phones; when it can't, say so plainly.
3. **Exact and honest about money.** Integer cents, rules enforced in the database, and a payment only counts when the person paid confirms it.
4. **Usable by the least technical member.** Plain words, helpful empty states, forgiving input.
5. **Judged on evidence.** Claims in the app and docs must be true and demonstrable in the live demo.

## Accessibility & Inclusion

Accessibility is built in, not added: screen-reader labels, 44 pt minimum touch targets, large-text layouts, WCAG contrast in light and dark, and color never the only signal. Screen readers have not yet been tried on real devices.
