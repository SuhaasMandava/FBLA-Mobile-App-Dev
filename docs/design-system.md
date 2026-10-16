# TripHub design system

TripHub is a group trip planner: one person creates a trip, shares a six-character invite code, and everyone plans the itinerary together. This document is the design plan for the redesign and the UX documentation for the FBLA presentation ("Together We Go: Group Trip Planner" is the competition topic; TripHub is the app).

It covers:

1. [Design rationale](#1-design-rationale)
2. [User journey](#2-user-journey)
3. [Audit of the current app](#3-audit-of-the-current-app)
4. [Tokens: color, type, spacing, radii](#4-tokens)
5. [Signature element: the Route](#5-signature-element-the-route)
6. [Motion](#6-motion)
7. [Components](#7-components)
8. [Screen-by-screen plan](#8-screen-by-screen-plan)
9. [Accessibility commitments](#9-accessibility-commitments)
10. [Plan critique](#10-plan-critique)
11. [Implementation order and open decisions](#11-implementation-order-and-open-decisions)

Guidelines are cited as `file.md › Heading` from Apple's Human Interface Guidelines (the copies in `.claude/skills/apple-design/references/hig/`). Anything not cited is design judgment and is labeled that way.

---

## 1. Design rationale

**The product in one sentence:** a shared, day-by-day plan for a group, so nobody has to ask "what are we doing tomorrow?" in the group chat.

**Who uses it:** students, families, and friend groups planning a trip together, mostly on phones, often while already traveling: one-handed, outdoors, in bright light, sometimes offline.

**What that means for the design:**

- **Familiar first.** Navigation and controls use the patterns people already know from iOS and Android: a bottom tab bar, large titles, grouped lists, native sheets, system dialogs. `branding.md › Best practices`: "Express your brand with familiar components."
- **Readable anywhere.** Large text by default (17 pt body), WCAG AA contrast in light and dark, and layouts that survive the largest text sizes. Travelers check plans in sunlight and at night.
- **One idea of personality, used well.** The Route, a dotted path that connects the stops of a trip, is TripHub's visual signature (see section 5). Everything else stays quiet. `branding.md`: "Apply your app's accent color judiciously."
- **Together is the point.** The app icon, empty states, and member list share one motif: a map pin with the group orbiting together inside it.

## 2. User journey

```text
 Install ──▶ Splash (icon motif) ──▶ Welcome
                                      │
                    ┌─────────────────┴────────────────┐
                Create account                      Sign in
                    └─────────────────┬────────────────┘
                                      ▼
                         Home: "No trips yet" empty state
                    ┌─────────────────┴────────────────┐
              Create Trip (sheet)              Join with Code (sheet)
              name, place, dates, budget       6-character invite code
                    └─────────────────┬────────────────┘
                                      ▼
            Home: trip hero ─ Coming up ─ Crew ─ Invite code ──▶ Share sheet
                │                                                  │
                │                                      friends install and join
                ▼
          Itinerary tab: one section per day, joined by the Route
                │  + Add ──▶ Activity sheet (title, day, time, place, notes)
                │  tap a stop ──▶ edit or delete (confirmation)
                │  Edit ──▶ reorder stops
                ▼
          Budget tab: spent vs. budget ─ Settle Up ─ Expenses
                │  + ──▶ Expense sheet (what, amount, category, who paid, split)
                │  tap your expense ──▶ edit or delete (confirmation)
                ▼
          Trip switcher (half-height sheet) ◀── from Home, any time
                ▼
          Settings: account, about, sign out (confirmation)
```

Moments that matter, and the design answer:

| Moment | What the person needs | Design answer |
| --- | --- | --- |
| First launch | "What is this and is it for me?" | Welcome screen states the value in one line, shows the icon motif, and goes straight to sign-up |
| No trips yet | A clear next step | Empty state with two actions: Create Trip, Join with Code |
| Just created a trip | Get friends in | Invite code is the most prominent thing on Home until someone joins |
| During the trip | "What's next?" | Home's Coming up shows the next three stops, with today marked on the Route |
| Someone paid for dinner | "What do I owe, and to whom?" | Log it in seconds with a live per-person preview; Settle Up lists the fewest payments that square everyone up |
| Offline | Trust the data on screen | Banner says the data is saved on this phone; edits explain why they can't be saved |

## 3. Audit of the current app

Scope: every screen in `screens/` and component in `components/`, read from code. Contrast is computed from the hex values in `utils/colors.ts`. Font scaling, VoiceOver order, and real-device rendering can't be fully verified from code; those items are marked **Verify on device**.

**Summary.** The app is careful underneath: tap targets are 44 pt or more almost everywhere, text contrast passes AA in both appearances, form errors are announced, and the trip switcher is already a native half-height sheet. Visually it has no point of view. The name is "FBLA-Mobile-App-Dev", the icon is Expo's default, the palette is a stock blue-and-gray set (`#2563EB`, `#111827`), the tab bar has no icons, and two of the five tabs show a single word. **Rating: Critical issues** (the tab bar and font-scaling findings below), most of which are quick to fix.

The brand color in code today is blue (`#2563EB`), not teal. The plan first moved the brand to teal as requested; at review it became Midnight & Sunset (section 4).

### Critical

**C1. The tab bar has no icons.**
- **What:** `RootNavigator.tsx` sets no `tabBarIcon`, so React Navigation draws its placeholder glyph above each of the five labels. Icon and label together are how people recognize a tab at a glance; here the icon slot is noise.
- **Why:** `tab-bars.md › Best practices`: "Include tab labels to help with navigation" and "Consider using SF Symbols to provide familiar, scalable tab bar icons." `icons.md › Best practices`: "Create a recognizable, highly simplified design."
- **Fix:** Add Ionicons (`@expo/vector-icons`) for every tab: outline when inactive, filled when active (`home`, `map`, `wallet`, `checkbox`, `settings`). Tab labels stay single words.

**C2. Layouts haven't been designed for the largest text sizes.**
- **What:** Text scales (nothing sets `allowFontScaling={false}`, which is good), but every row is fixed horizontal: member name plus "Organizer" pushed right with `marginLeft: 'auto'`, Coming up header plus "See all" with negative margins, itinerary rows with two 44 x 56 arrow buttons beside the title, and the segmented control putting "Create Account" in half the width. At accessibility sizes (AX1 to AX5, up to about 310%), these crowd, truncate, or overlap. **Verify on device.**
- **Why:** `typography.md › Supporting Dynamic Type`: "Make sure your app's layout adapts to all font sizes" and "Consider adjusting your layout at large font sizes." `layout.md › Adaptability`: "horizontally adjacent views may need to stack vertically."
- **Fix:** A `useLargeText()` hook reads `useWindowDimensions().fontScale`; at 1.35 or more, `ListRow`, `SectionHeader`, and the itinerary row stack vertically and icons scale with text. Test at the largest setting on both platforms.

**C3. Form hints are spoken but never shown.**
- **What:** `FormField`'s `hint` (for example "Between 3 and 50 characters.", "At least 8 characters, with a letter and a number.") goes only to `accessibilityHint`. Sighted people never see the password rules until they break them.
- **Why:** `entering-data.md › Best practices`: "Be clear about the data you need." `writing.md › Best practices`: "Show hints in text fields." `accessibility.md`: an interface "doesn't rely on any single method to convey information."
- **Fix:** `TextField` shows `helper` text under the input (footnote, secondary color) and also speaks it. An error replaces the helper while it's present.

**C4. A field's error isn't read when focus returns to the field.**
- **What:** Errors are a separate `Text` with `accessibilityRole="alert"`. They're announced once, but moving back to the input reads only its label, not that it's invalid.
- **Why:** `accessibility.md › Vision`: "Describe your app's interface and content for VoiceOver." `writing.md`: display an error "as close to the problem as possible."
- **Fix:** `TextField` sets the input's `accessibilityHint` to the error while it exists (for example "Invalid. Trip name must be at least 3 characters.") and adds a leading `alert-circle` icon so the error isn't marked by red alone.

### Improvements

**H1. No identity: name, icon, and palette are defaults.** (High)
- **What:** App name "FBLA-Mobile-App-Dev" (shows under the home-screen icon), Expo's placeholder icon and splash, Tailwind-default blue and gray, and "Welcome" as the only first-run text.
- **Why:** `branding.md › Best practices`: "Use your brand's unique voice and tone." The skill's craft lens: a palette that "arrives with no reason rooted in the product is a default, not a choice."
- **Fix:** Rename to TripHub, create the icon and splash in section 5, adopt the palette in section 4, and give Welcome one line of value: "Plan the trip together, from first idea to last stop."

**H2. Budget and Checklist tabs show only their own name.** (High)
- **What:** `ScreenPlaceholder` renders the word "Budget" or "Checklist" centered on a blank screen.
- **Why:** `tab-bars.md › Best practices`: "Don't disable or hide tab bar buttons, even when their content is unavailable … If a section is empty, explain why its content is unavailable." `writing.md`: "Provide clear next steps on any blank screens."
- **Fix:** Keep the tabs and replace the placeholder with an `EmptyState`. Budget shows the trip's budget total (data already on the trip) and says expense tracking is coming. Checklist explains what it will hold. No new logic.

**H3. Forms open as modals with no Cancel.** (High)
- **What:** Create Trip, Join Trip, and Add/Edit Activity are `presentation: 'modal'` with no header button to leave. On iOS the only way out is a swipe, which isn't discoverable and isn't available to everyone. A swipe also throws away typed data without asking.
- **Why:** `sheets.md › Best practices`: "Provide an alternative to the Done button … pair it with a Cancel button." `sheets.md › Mobile`: "If people have unsaved changes in the sheet when they begin swiping to dismiss it, use an action sheet to let them confirm." `accessibility.md › Mobility`: "Offer alternatives to gestures."
- **Fix:** Add a Cancel header button on all three. When the form is dirty, Cancel and swipe-to-dismiss show a "Discard Changes" / "Keep Editing" action sheet (`usePreventRemove` from React Navigation reads the form's `isDirty`; no form logic changes).

**H4. Icons are typed characters with no shared visual language.** (High)
- **What:** `▾` (switch trip), `✓` (current trip), `▲ ▼` (reorder), `+ Add`: four glyphs from whatever font is installed, at different weights.
- **Why:** `icons.md › Best practices`: "Maintain visual consistency across all interface icons in your app" and "match the weights of interface icons and adjacent text."
- **Fix:** Ionicons everywhere, through one `Icon` wrapper that sizes the glyph from the adjacent text style and the font scale.

**H5. Headers are small and generic.** (High)
- **What:** Tab screens use the bottom-tab header: a small centered title that repeats the tab label. Home's real title (the trip name) is a 22 pt line inside the content.
- **Why:** `designing-for-ios.md › Best practices`: "Adapt seamlessly to appearance changes"; large titles are the iOS convention for top-level views (judgment, consistent with `typography.md`'s Large Title role).
- **Fix:** Give each tab its own native stack with `headerLargeTitle` on iOS (collapses on scroll, like Settings or Mail) and a standard top app bar on Android. Home's large title is the trip name; a "Trips" button in the header opens the switcher.

**M1. One color means two things.** (Medium)
- **What:** Brand blue marks buttons and links ("See all", "+ Add", "Clear", "Show"), and also non-interactive text (activity times, "Coming up" dates).
- **Why:** `color.md › Best practices`: "Avoid using the same color to mean different things … using the same or similar color to stylize noninteractive text is confusing."
- **Fix:** Accent-colored text is reserved for things you can tap. Times and dates use the primary label color with tabular figures. The accent also appears in the Route graphic, which is decorative and never text.

**M2. Every block is the same gray card.** (Medium)
- **What:** Home is five identical `surface` cards, each starting with a 12 pt gray label. Nothing leads; the invite code (the most important thing for a new trip) looks the same as the budget.
- **Why:** `layout.md › Visual hierarchy`: "Order content by relative importance" and "Group related items."
- **Fix:** A trip hero at the top (name, place, dates, Route progress), then grouped sections with real section headers. The invite card moves to the top while you're the only member.

**M3. Full-screen spinners while cached data exists.** (Medium)
- **What:** "Loading your trips…" and "Loading itinerary…" replace the whole screen with a spinner.
- **Why:** `loading.md › Best practices`: "Show something as soon as possible … consider showing placeholder text, graphics, or animations."
- **Fix:** Skeleton rows shaped like the real content on first load (static under Reduce Motion). The spinner remains only for the startup session check.

**M4. Errors are bare red text with no way to act.** (Medium)
- **What:** Load errors on Home and Itinerary appear as a red line at the top of the list. Sharing errors use an alert.
- **Why:** `feedback.md › Best practices`: "Consider integrating status feedback into your interface" and "Show people when a command can't be carried out and help them understand why." `alerts.md`: "Avoid using an alert merely to provide information."
- **Fix:** An `InlineBanner` (icon + message + "Try Again") for load errors, the same component as the offline banner. Share errors become an inline banner too.

**M5. The same action has three names.** (Medium)
- **What:** "Create a Trip" (Home), "Create New Trip" (switcher), "Create Trip" (form button), header "Create a Trip". "Join with a Code", header "Join a Trip", button "Join Trip".
- **Why:** `writing.md › Best practices`: "Build language patterns. Consistency builds familiarity."
- **Fix:** One name per action: **Create Trip** and **Join with Code** for buttons, headers "New Trip" and "Join Trip", and the submit buttons match the header ("Create Trip", "Join Trip").

**M6. Destructive confirmations use center alerts.** (Medium)
- **What:** Sign Out and Delete Activity use `Alert.alert` with a destructive button.
- **Why:** `alerts.md › Mobile`: "Use an action sheet — not an alert — to offer choices related to an intentional action."
- **Fix:** iOS uses `ActionSheetIOS` with the destructive button and Cancel. Android keeps the Material `Alert` dialog, which is its convention. Copy says what happens: "Signing out removes the trips saved on this phone. You can sign back in any time."

**M7. Reordering is always on screen.** (Medium)
- **What:** Every itinerary row carries two arrow buttons, which take a third of the row and push the title.
- **Why:** `lists-and-tables.md › Best practices`: "In iOS and iPadOS, people must enter an edit mode before they can select table items." `designing-for-ios.md`: "limiting the number of onscreen controls."
- **Fix:** An "Edit" header button shows the arrows. Screen reader users get "Move Earlier" and "Move Later" as `accessibilityActions` on each row at all times, so reordering never requires edit mode.

**M8. Settings is one card and an outlined button.** (Medium)
- **What:** The account email in a card and a blue-outlined "Sign Out" button.
- **Why:** `settings.md` and `lists-and-tables.md`: settings read best as a grouped list.
- **Fix:** Grouped list: Account (name, email), About (version, "Made for FBLA"), and a destructive-text Sign Out row.

**L1. Small labels.** (Low) Field labels and card labels are 12 pt medium. That passes the 11 pt minimum, but it's the smallest text on screen and it labels the most important controls. Move to subhead (15 pt).

**L2. An unused appearance switch.** (Low) `ThemeContext` stores a light/dark/system preference that nothing in the UI sets. `dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting." Keep following the system and remove the stored preference.

### Craft notes

- **Point of view:** none yet. The app works but nothing about it says "group trip." The Route and the three-dot motif (section 5) are the fix.
- **Remove one accessory:** the "Add Activity" primary button at the top of the itinerary repeats the per-day "+ Add" buttons. It moves into the header as a single "+" button.

### What works (keep it)

- Tap targets: buttons and fields are at least 48 pt tall. "See all", "+ Add", Clear, and Show have at least 44 x 44 pt hit areas.
- Contrast in the current palette passes AA: muted text `#656C79` on white is 5.28:1, primary `#2563EB` on white is 5.17:1, dark muted `#9CA3AF` on `#161B26` is 6.79:1. Input outlines are 3.60:1 (light) and 3.56:1 (dark), above the 3:1 non-text minimum.
- Form errors are announced (`accessibilityLiveRegion`, `announceForAccessibility`), and grouped cards (members, invite code) read as one sentence.
- The trip switcher is a native `formSheet` with detents and a grabber, which is exactly the system pattern.
- Native date pickers on both platforms. The invite code is selectable and read character by character.
- Offline banner with inverted colors, clear copy, and announcement.

## 4. Tokens

All tokens live in one typed file and reach screens only through `useTheme()`. Nothing in a screen hard-codes a hex value, font size, or spacing number.

### Color

**Palette: Midnight & Sunset.** A navy night sky over a warm horizon: the feeling of setting off on a trip. Navy carries identity (the icon, the trip hero card); sunset orange marks everything you can tap. It was chosen over the first teal palette because it reads as more premium and stands apart from the many teal and blue travel apps. Every value is checked by `npm run check:contrast`. Ratios are WCAG 2, against the surface each color sits on.

| Token | Role | Light | Dark | Contrast (light / dark) |
| --- | --- | --- | --- | --- |
| `background` | Grouped screen background | `#F3F5F9` | `#0B1020` | |
| `surface` | Cards, list rows, fields | `#FFFFFF` | `#151C30` | |
| `surfaceRaised` | Sheets, menus (dark elevation) | `#FFFFFF` | `#1C2540` | |
| `label` | Primary text | `#111827` | `#EEF1F7` | 17.7 / 14.96 on surface |
| `labelSecondary` | Supporting text, helper text, placeholders | `#586174` | `#A3ADC2` | 6.22 / 7.51 on surface; 5.70 / 8.40 on background |
| `separator` | Hairlines (decorative only) | `#DDE2EA` | `#283252` | not used for meaning |
| `fieldBorder` | Outline of inputs and pickers | `#7A8394` | `#6F7B96` | 3.82 / 3.99 on surface (3:1 non-text minimum) |
| `accent` | Sunset: primary buttons, links, selection, the Route | `#C2410C` | `#FF8A7A` | 5.18 on white / 7.39 on surface |
| `accentPressed` | Pressed state of filled buttons | `#9A3412` | `#FF7563` | |
| `onAccent` | Text and icons on `accent` | `#FFFFFF` | `#2A0A05` | 5.18 / 8.01 |
| `accentTint` | Fill of tinted (secondary) buttons, selected rows, badges | `#FDEBE4` | `#3A1E22` | |
| `onAccentTint` | Text on `accentTint` | `#9A3412` | `#FF9C8E` | 6.33 / 7.49 |
| `danger` | Errors and destructive actions (rose, kept apart from the orange accent) | `#BE123C` | `#FB7185` | 6.29 / 6.29 on surface |
| `success` | Confirmation (always with an icon) | `#15803D` | `#6EE7A0` | 4.60 on background / 9.80 |
| `warning` | Offline, caution (always with an icon) | `#A16207` | `#FBBF24` | 4.51 on background / 9.06 |
| `hero` | Midnight navy trip hero card | `#152B5C` | `#18264A` | |
| `onHero`, `onHeroSecondary` | Text on the hero card | `#FFFFFF`, `#C9D3EA` | same | 13.71 and 9.13 / 14.84 and 9.89 |
| `heroAccent` | The Route and icons on the hero card | `#FF8A7A` | `#FF8A7A` | 5.98 / 6.48 (3:1 non-text) |
| `markDisc`, `markPin`, `markSun`, `markPlanet` | The app mark (decorative) | navy disc, white pin, amber center, blue dots | same | not text |

Rules:

- **Sunset orange means "you can act on this" or "this is the Route."** Never body text or times.
- **Signal colors always travel with an icon or words.** Errors use rose, not orange, and always carry an alert icon (`color.md › Inclusive color`). Orange and rose can look alike to some people, so the icon is what tells them apart.
- `accent` text on `accentTint` is below AA in light mode. Tinted buttons use `onAccentTint` instead.
- `fieldBorder` passes 3:1 on both `surface` and `background` (3.50:1 on the light background).
- **Increased contrast:** when the system's Increase Contrast setting (iOS) or high-contrast text (Android) is on, `labelSecondary` becomes `label` and `separator` becomes `fieldBorder`. Read via `AccessibilityInfo.isDarkerSystemColorsEnabled()` on iOS and `AccessibilityInfo.isHighTextContrastEnabled()` on Android, with change listeners. **Verify on device.**

### Type

System font only: San Francisco on iOS, Roboto on Android. It supports Dynamic Type, Bold Text, and every language for free (`typography.md › Using system fonts`). Brand personality comes from the Route, color, and copy, not from a custom face.

| Role | Size / line height (pt) | Weight | Used for |
| --- | --- | --- | --- |
| `largeTitle` | 34 / 41 | Bold | Screen titles (iOS large title, Welcome) |
| `title1` | 28 / 34 | Bold | Trip name in the hero |
| `title2` | 22 / 28 | Bold | Empty-state titles, sheet titles |
| `title3` | 20 / 25 | Semibold | Day headings on Itinerary |
| `headline` | 17 / 22 | Semibold | Row titles, button labels |
| `body` | 17 / 22 | Regular | Default text, field input |
| `callout` | 16 / 21 | Regular | Empty-state body |
| `subhead` | 15 / 20 | Regular / Semibold | Field labels, secondary row text |
| `footnote` | 13 / 18 | Regular | Helper text, errors, section footers |
| `caption` | 12 / 16 | Medium | Tab labels, badges (the smallest text in the app) |
| `code` | 28 / 34 | Semibold, monospace, letter spacing 4 | Invite code only |

Sizes follow the iOS "Large (default)" Dynamic Type table (`typography.md › Specifications`). Times, dates, and money use `fontVariant: ['tabular-nums']` so columns line up. No weight lighter than Regular. Nothing below 12 pt.

### Spacing

A 4 pt base, with names instead of numbers:

| Token | Value | Typical use |
| --- | --- | --- |
| `xxs` | 4 | Icon to label |
| `xs` | 8 | Inside a row, between label and field |
| `sm` | 12 | Between controls with a bezel (`accessibility.md › Mobility`: "about 12 points of padding") |
| `md` | 16 | Screen side margins, card padding |
| `lg` | 24 | Between sections; around borderless controls |
| `xl` | 32 | Above a screen's primary action |
| `xxl` | 48 | Empty-state top padding |

Minimum hit target: 44 x 44 pt (`accessibility.md › Mobility`), exported as `layout.minTarget`.

### Corner radii

Concentric: an element inside a container gets a smaller radius than the container.

| Token | Value | Used for |
| --- | --- | --- |
| `sm` | 8 | Badges, skeleton lines |
| `md` | 12 | Text fields, date fields, segmented control segments |
| `lg` | 16 | Cards and grouped list sections |
| `xl` | 24 | Trip hero |
| `pill` | 999 | Buttons (capsules, matching current iOS), avatars, the Route's stops |

Sheets keep the native corner radius.

### Elevation

Flat in light mode except one soft shadow under the navy trip hero. In dark mode, elevation is shown with `surfaceRaised`, not shadows (`dark-mode.md › Mobile`: the system "uses the elevated background" for things in front).

## 5. Signature element: the Route

**What it is:** a dotted sunset-orange line with round stops. It connects the days of a trip, the way a route connects stops on a map.

**Where it appears (and nowhere else):**

1. **Itinerary.** Each day section hangs off a vertical dotted line in the leading margin. Every activity is a small stop on the line; today's stop is filled and slightly larger. The line is decorative (hidden from screen readers); the day heading and row carry the meaning.
2. **Home hero.** A short horizontal Route under the trip name shows trip progress: one stop per day, past days filled, today ringed, future days hollow. Spoken as "Day 2 of 5" (or "Starts in 12 days").
3. **App icon and splash: Pin & Orbit.** A white map pin on a midnight-navy disc, with the group (two blue dots) orbiting an amber center inside it, and a trail of route dots leading to its point.
4. **Welcome, loading, and empty states.** `AppMark`, a small version of the icon drawn in code (navy disc, white pin, amber center, orbit ring, route dots).

**Why it belongs to TripHub:** an itinerary is a route, and a group trip is several people on the same one. The motif says "trip" and "together" without a logo, a suitcase, or an airplane (which every travel app uses). `branding.md › Best practices`: "Ensure branding always defers to content." The Route is built from the content itself (days and stops), so it adds meaning instead of decoration.

**App icon specification** (no Apple artwork, trademarks, or SF Symbols assets; `branding.md › Follow Apple's trademark guidelines`, `app-icons.md`):

- Source artwork: `assets/TripHub Icon.jpg`, supplied by the team. `scripts/make-icons.py` cuts the round icon out of that sheet and builds every asset from it.
- The artwork: a white map pin on a brushed midnight-navy disc. Inside the pin, an amber center is circled by an orbit ring with two blue dots (the group, traveling together), and a short trail of dots leads to the pin's point (the Route).
- App icon: the disc's shading is extended outward to fill a full-bleed square (no visible circle edge), with the pin covering about 70% of the width. The system applies its own rounded mask.
- Android adaptive icon: the same artwork at 50% inside the safe zone, a solid navy (`#223658`) background layer, and a white silhouette of the pin for themed icons.
- Splash: the round disc itself, centered on `#F3F5F9` (light) and `#0B1020` (dark), with no text (`branding.md`: "Avoid using a launch screen as a branding opportunity").
- Resolution: the source sheet is an 832 px JPEG, so the 1024 px icon is enlarged about 1.7x from it. A 1024 px (or larger) PNG of the round icon alone would make every size sharper; drop it in and rerun the script.

## 6. Motion

Rules (`motion.md`):

- **System transitions only for navigation.** Native stack pushes, sheet presentation, and tab switches are left to the platform.
- **Press feedback:** opacity 0.7 on press for rows and plain buttons, background change for filled buttons. No scale bounce on frequent actions (`motion.md › Providing feedback`: "generally avoid adding motion to UI interactions that occur frequently").
- **Durations:** 150 ms for state changes, 250 ms for appearing content. Ease-out. Nothing loops except the skeleton pulse.
- **One orchestrated moment:** when the active trip changes, the hero's Route stops fill in from left to right over 300 ms. It's the moment you "arrive" at a trip.
- **Reduce Motion:** a `useReducedMotion()` hook reads `AccessibilityInfo.isReduceMotionEnabled()` and listens for changes. When it's on, the Route appears without the fill-in, skeletons stay static (no pulse), and any movement becomes a cross-fade (`accessibility.md › Cognitive`).
- Nothing waits for an animation to finish before accepting input.

## 7. Components

Screens compose these; no screen defines its own button, row, or field styles. Existing components are refined in place where they already exist.

| Component | Replaces | What it does |
| --- | --- | --- |
| `Button` | `PrimaryButton` | Variants: `filled` (sunset), `tinted` (sunset tint), `plain` (text only), `destructive`. Capsule, min height 50, optional leading Ionicon, loading state keeps its width, `accessibilityRole="button"` and `accessibilityState` built in |
| `Card` | ad hoc `styles.card` | `surface` background, `lg` radius, `md` padding; `variant="hero"` for the trip hero |
| `ListSection` | | Grouped container: optional `SectionHeader`, rows with inset separators, optional footer text |
| `ListRow` | trip rows, member rows, settings rows | Leading icon or avatar, title, subtitle, trailing value / chevron / checkmark / badge. Min height 44. Stacks vertically when text is large. One `accessibilityLabel` for the whole row |
| `SectionHeader` | "Coming up", "Members" labels | Title (`headline`) with an optional trailing plain action ("See All"). `accessibilityRole="header"` |
| `TextField` | `FormField` | Visible label, input, visible helper text, inline error with icon that replaces the helper, error included in the spoken hint, Clear button for non-secure text, Show/Hide for passwords |
| `DateTimeField` | (kept) | Restyled to match `TextField`, with a calendar or clock icon |
| `SegmentedControl` | (kept) | Restyled: `background` track, `surface` thumb, label weight change for selection (not color alone) |
| `EmptyState` | `ScreenPlaceholder`, empty `StatusMessage` | Route-motif graphic, title, body, up to two actions |
| `ErrorState` | error `StatusMessage` | Same layout as EmptyState with an `alert-circle` icon and "Try Again" |
| `Skeleton` | loading `StatusMessage` | Placeholder rows shaped like the content; pulses unless Reduce Motion is on; hidden from screen readers with a single "Loading" label on the container |
| `InlineBanner` | `OfflineBanner`, red error text | Icon + message + optional action. Tones: `offline` (warning, cloud icon), `warning` (warning, triangle icon, e.g. "puts the trip over budget"), `error` (danger) |
| `ChoiceChips` | | One-of-several choice as wrapping capsules (expense category). Announced as a radio group; the selected chip gets a tint, a heavier outline, and a checkmark in place of its icon, so selection isn't color alone. 44 pt tall |
| `Stepper` | | − value + for whole numbers (expense shares). One adjustable element for screen readers (swipe up/down), two 44 pt buttons for touch |
| `BudgetMeter` | | Spent-of-budget bar on the navy hero card, drawn in `heroAccent` like the Route. Decorative; the text beside it carries the amounts and the over-budget state |
| `Badge` | "Organizer" text | Small `accentTint` capsule with `caption` text ("Organizer", "Today") |
| `Avatar`, `AvatarStack` | `MemberAvatar` | Initials circle; the stack overlaps three avatars and "+2" for the hero |
| `Icon` | text glyphs | Ionicons wrapper: size follows the text style and font scale; decorative by default, labeled when standalone |
| `Sheet` | sheet layout in `TripSwitcherScreen` | Layout for screens shown as native sheets: title row with optional Cancel / Done, scrolling body, pinned footer that respects the bottom safe area. It does not draw its own modal: presentation stays native (`formSheet`), which already provides the grabber, detents, and swipe to dismiss |
| `RouteLine`, `RouteProgress` | | The signature element (section 5); decorative, hidden from screen readers |

Hooks: `useTheme()` (tokens and scheme), `useLargeText()` (font scale threshold), `useReducedMotion()`, `confirmDestructive()` helper (action sheet on iOS, alert on Android).

## 8. Screen-by-screen plan

Layout sketches at compact width (phones). On tablets (regular width) the same screens center their content at a readable maximum width of 640 pt; the tab bar stays a tab bar.

### Welcome (Onboarding)

```text
┌──────────────────────────────┐
│                              │
│        ●●●  (icon motif)     │
│         ╲                    │
│  TripHub                     │  largeTitle
│  Plan the trip together,     │  callout, secondary
│  from first idea to last     │
│  stop.                       │
│                              │
│ [ Create Account | Sign In ] │  segmented
│                              │
│  Name                        │
│ ┌──────────────────────────┐ │
│ └──────────────────────────┘ │
│  Shown to the people on      │  helper, visible
│  your trips.                 │
│  …                           │
│ (      Create Account      ) │  filled capsule
└──────────────────────────────┘
```

Create Account becomes the first segment (new people are the common case on first launch); Sign In remains one tap away. Text and fields are unchanged.

### Home

```text
┌──────────────────────────────┐
│ Lake Tahoe Weekend    [Trips]│  iOS large title; Trips opens switcher
│ ┌──────────────────────────┐ │
│ │ Lake Tahoe, CA           │ │  hero card
│ │ Jun 12 – Jun 15          │ │
│ │ ●──●──◉──○──○  Day 3 of 5 │ │  RouteProgress
│ │ (A)(B)(C) +2             │ │  AvatarStack
│ └──────────────────────────┘ │
│ Coming Up            See All │  SectionHeader
│ ┌──────────────────────────┐ │
│ │ Today · 9:00 AM          │ │  ListRow
│ │ Morning hike           › │ │
│ ├──────────────────────────┤ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│ Invite Friends               │
│ ┌──────────────────────────┐ │
│ │ K 7 M 9 P Q   (code)     │ │
│ │ (   Share Invite Code   )│ │
│ └──────────────────────────┘ │
│ Budget                       │
│ │ Total             $1,500 │ │
│ Crew · 5                     │
│ │ (A) Alex Rivera [Organizer]│
├──────────────────────────────┤
│  Home  Itinerary Budget …    │  tab bar with icons
└──────────────────────────────┘
```

While you're the only member, Invite Friends moves above Coming Up.

### Itinerary

Large title "Itinerary", header buttons "Edit" and "+" (Add Activity). One section per day: `title3` day heading with "+ Add" plain button, rows hung on the RouteLine. Empty day: "Nothing planned. Tap + to add a stop." Edit mode shows reorder arrows; screen readers always get Move Earlier / Move Later actions.

### Activity (Add / Edit), Create Trip, Join Trip

Native modal sheets with Cancel (leading) and the save action as a filled button at the bottom of the form, matching the header title. Fields use `TextField` with visible helpers. Edit Activity has a "Delete Activity" destructive plain button at the bottom, confirmed with an action sheet. Join Trip shows the code field in the `code` style, centered, with "Ask the organizer for the 6-character code."

### Trip switcher (sheet)

Title "Trips", grouped `ListSection` of trips (name, place · dates, checkmark and `accentTint` for the current trip), then a pinned footer with "Create Trip" (filled) and "Join with Code" (tinted).

### Budget

Built after the redesign, from the same components. Top to bottom:

1. **Summary** on the navy hero card (like Home's trip hero): "Spent so far", the amount in `largeTitle`, "of $1,200.00", the `BudgetMeter`, and a status line: "$376.50 left", "No budget set for this trip", or, with an `alert-circle` icon and heavier text, "Over budget by $123.50". The card is a single screen-reader element that reads all of it.
2. **Settle Up**: one row per payment, "Max Chen pays Sam Patel · $220.87" ("You pay…" / "…pays you" when it's you), and a footer saying how many payments square everyone up and that it's the fewest possible. "Everyone's even" with a checkmark when nothing is owed.
3. **Expenses · N**, newest first: category icon, "Tue, Oct 13 · Food" overline, description, "Paid by Alex Kim · split 4 ways", the amount. Rows you may edit (you paid, or you're the organizer) have a chevron and open the sheet; the others aren't buttons. A footer says who can edit.

The + in the header opens the **Expense sheet**: Description, Amount, Category (`ChoiceChips`), Paid By (a pickable list for organizers; a fixed "You" row and an explanation for members), Split (`SegmentedControl`: Evenly / By Shares) with one row per member showing what they'd owe as you type. Evenly: tap people in or out (checkmark plus "Not included" in words). By Shares: a `Stepper` per person. A footnote confirms the split adds up to the exact amount, and a `warning` banner appears before an expense would take the trip over budget. Offline, saving says so straight away. With no expenses yet the list shows an inline `EmptyState` with an Add Expense button.

### Checklist

`EmptyState` with the Route motif: "Packing lists and to-dos for the group are coming soon." No disabled button.

### Settings

Large title "Settings". Grouped list: **Account** (name, email), **About** (TripHub, version), then a destructive-text "Sign Out" row confirmed by an action sheet.

## 9. Accessibility commitments

These are the acceptance criteria for Phase 3.

- **Dynamic Type:** all text uses token styles and scales with the system setting. No `allowFontScaling={false}` anywhere. Tab bar labels cap at 1.5x (the bar's height is fixed by the system); everything else scales fully. Layouts are checked at the largest accessibility size on iOS and at 200% font size on Android.
- **Targets:** every interactive element is at least 44 x 44 pt, with at least 12 pt between bezeled controls.
- **Contrast:** every text pair in section 4 is at least 4.5:1, and every non-text control boundary at least 3:1, in both appearances. A small Node script in `scripts/` re-checks the token pairs.
- **Screen readers:** every `Pressable` has `accessibilityRole` and `accessibilityLabel`; icon-only buttons have labels; decorative graphics (Route, avatars, icons beside text) are hidden; headings use `accessibilityRole="header"`; errors are announced and remain attached to their field.
- **Color is never the only signal:** errors, offline, success, current trip, and selected segment each carry an icon, a weight change, or words.
- **Reduce Motion:** honored as described in section 6.
- **Appearance:** follows the system light/dark setting, with no in-app switch.

## 10. Plan critique

**Would this plan fit any other app?** The first draft would have. It was "teal accent, white cards, system font, rounded corners": the look of most travel and fintech starter templates, and nothing in it said "group trip." Three changes make it specific:

1. **The Route replaced a generic hero.** The first draft had a big gradient header card with the trip name. That's decoration. The Route is built from the trip's own days and stops, so it carries information (where you are in the trip) and identity at the same time.
2. **A palette with a story.** Midnight navy and sunset orange come from travel itself (setting off at dusk), and the navy hero card gives Home one rich, premium moment while everything else stays light and quiet. (The first draft used teal; it was replaced at review because it looked like many other travel apps.)
3. **The group is visible.** The orbiting dots in the icon, the avatar stack in the hero, and the Crew section put the "together" in "Together We Go" on screen instead of only in the pitch.

**What was rejected and why:**

- *A custom display font* (for example a rounded geometric face). It would add personality but costs Dynamic Type fidelity and Bold Text support, adds a dependency, and the brief prizes accessibility. The Route carries the personality instead.
- *A second accent color* (a warm coral for "today"). Two accents compete. "Today" is shown by a filled, larger stop and a "Today" badge, which also works without color.
- *A custom JavaScript bottom sheet.* The native `formSheet` already has the grabber, detents, swipe to dismiss, and VoiceOver support. The `Sheet` component only lays out content inside it.
- *Glass or blur effects on cards.* `liquid-glass.md`: glass belongs to the floating control layer, not content. The system bars already supply it on iOS.

**Platform check:** navigation (tab bar, native stacks, sheets), controls (native date pickers, segmented control, system dialogs), and type (system fonts) all stay platform-standard. iOS gets large titles and action sheets; Android gets its standard top app bar and Material dialogs. Capitalization stays title-style for buttons on both platforms, so the app has one consistent voice; that's a deliberate trade-off against Material's sentence case.

**One more thing to remove:** the in-app theme preference (L2). Nothing is lost; the system setting already does this.

## 11. Implementation order and open decisions

Order follows the skill: accessibility, then conventions, then craft, then polish. Each step is its own commit.

1. Rename to TripHub (`app.json` name, slug, scheme; `package.json` name; README title; on-screen text).
2. Tokens and `ThemeContext` (system light/dark, increased-contrast handling), `useLargeText`, `useReducedMotion`.
3. Install `@expo/vector-icons` with `npx expo install`; `Icon` wrapper; tab bar icons.
4. Components (section 7).
5. Navigation structure: per-tab native stacks with large titles, Cancel on form sheets, discard confirmation.
6. Restyle screens one at a time: Welcome, Home, Itinerary, Activity, Create Trip, Join Trip, Trip switcher, Budget, Checklist, Settings.
7. Icon and splash assets, `app.json` icon / adaptive icon / splash configuration.
8. Verify: `npx tsc --noEmit`, `npx expo lint .`, the contrast script, then a second design review of every screen. README "Design system & accessibility" section.

Out of scope (no business logic, service, schema, or validation changes): expense tracking on the Budget tab, checklist data, haptics (would need `expo-haptics`), and any change to what the forms accept.

**Decisions made (approved):**

- Tokens live in a root `theme/theme.ts`; components stay in `components/`. The repo keeps its root-folder layout instead of moving under `src/`.
- Home's iOS large title is the trip name. Names longer than 22 characters are also shown in full in the hero card, since a large title is one line.
- The icon is the team's supplied artwork (`assets/TripHub Icon.jpg`); `scripts/make-icons.py` (Pillow) builds the icon, Android layers, splash, and favicon from it.
