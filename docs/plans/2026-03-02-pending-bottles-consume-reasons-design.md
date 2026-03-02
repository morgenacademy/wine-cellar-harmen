# Pending Bottles & Consume Reasons

## Context

Wine cellar app (React + Supabase). Two features requested:
1. Support for "pending" bottles (ordered but not yet delivered, typically from CellarTracker sync)
2. Extended consume flow with reason (drunk/sold/lost/gifted) and custom date

## Navigation Change

Tab order: Dashboard — Wijnen — **Lijst** (default) — Locaties — Toevoegen

Lijst remains the default landing page (`/` route), positioned in the center of the nav bar.

## Feature 1: Pending Bottles

### Database

Add to `bottles` table:
```sql
ALTER TABLE bottles ADD COLUMN pending boolean NOT NULL DEFAULT false;
```

### Behavior

- A pending bottle is a normal `bottles` row with `pending = true`
- Pending bottles have `slot_id = null` (cannot be placed until received)
- "Ontvangen" action sets `pending = false` — bottle becomes an unplaced bottle in the collection
- Pending bottles do NOT count toward dashboard totals (total bottles, cost, value)

### CSV Import

- Add toggle on import page: "Dit zijn pending flessen"
- When toggled, all imported bottles get `pending = true`
- Sync mode: pending bottles matched by `cellartracker_id` stay pending unless manually received

### WineList Display

- Pending wines appear in the normal list hierarchy (same grouping by section/color/country/region)
- Quantity badge shows pending count separately: e.g. "3 + 2 besteld"
- Subtle orange "Besteld" badge next to pending count

### WineDetail Display

- Pending bottles shown in a separate subsection below active bottles
- Each pending bottle has an "Ontvangen" button
- "Alle ontvangen" bulk button when multiple pending bottles of same wine

### Dashboard

- Main bottle count excludes pending
- Small "X besteld" indicator near the total

## Feature 2: Consume with Reason & Date

### Database

Add to `bottles` table:
```sql
ALTER TABLE bottles ADD COLUMN consume_reason text;
```

Valid values: `drunk`, `sold`, `lost`, `gifted`. NULL for non-consumed bottles.

`consumed_at` already exists — we make the date user-selectable instead of always using `new Date()`.

### UI Flow

Clicking "Gedronken" (or equivalent) opens a bottom sheet / modal with:
- 4 choice buttons: Gedronken (drunk) / Verkocht (sold) / Verloren (lost) / Weggegeven (gifted)
- Date input, defaulting to today
- Confirm button

The sheet replaces the current direct-action "Gedronken" button in:
- SlotDetail component (bottle actions in slot view)
- WineDetail page (bottle actions in wine view)

### Dashboard

"Recent gedronken" section becomes "Recent verwijderd" showing:
- Icon per reason: wine glass (drunk), coin (sold), question mark (lost), gift (gifted)
- Date and wine name as before

## Files to Modify

### Database migration
- SQL: add `pending` and `consume_reason` columns

### Types
- `src/types/database.ts` — add `pending` and `consume_reason` to Bottle type

### Navigation
- `src/App.tsx` — reorder nav tabs

### Hooks
- `src/hooks/useBottles.ts` — update `useConsumeBottle` to accept reason + date, add `useReceiveBottle`
- `src/hooks/useDashboard.ts` — exclude pending from totals, add pending count
- `src/hooks/useWines.ts` — no change (pending bottles already have `consumed_at = null`)

### Components
- `src/components/SlotDetail.tsx` — replace direct consume with sheet trigger
- New: `src/components/ConsumeSheet.tsx` — reason + date picker sheet

### Pages
- `src/pages/WineList.tsx` — show pending count with badge
- `src/pages/WineDetail.tsx` — pending bottles section, receive button, consume sheet
- `src/pages/Dashboard.tsx` — pending count indicator, consume reason icons
- `src/pages/AddWine.tsx` — pending toggle on CSV import
