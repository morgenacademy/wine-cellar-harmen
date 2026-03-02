# Pending Bottles & Consume Reasons — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pending bottle support (from CellarTracker import) and an extended consume flow with reason + date picker.

**Architecture:** Two new columns on the `bottles` table (`pending boolean`, `consume_reason text`). A new `ConsumeSheet` bottom-sheet component replaces direct consume actions. Pending bottles are shown inline in the wine list with an orange badge and can be "received" to become normal unplaced bottles.

**Tech Stack:** React 19, TypeScript, Supabase (PostgreSQL), TanStack React Query, Tailwind CSS 4, React Router DOM 7

---

### Task 1: Database migration + types

**Files:**
- Modify: `app/src/types/database.ts:39-45` (Bottle type)

**Step 1: Run SQL migration in Supabase**

Execute via Supabase SQL Editor (user will do this manually):
```sql
ALTER TABLE bottles ADD COLUMN pending boolean NOT NULL DEFAULT false;
ALTER TABLE bottles ADD COLUMN consume_reason text;
```

**Step 2: Update TypeScript Bottle type**

In `app/src/types/database.ts`, update the `Bottle` type:

```typescript
export type Bottle = {
  id: string
  wine_id: string
  slot_id: string | null
  added_at: string
  consumed_at: string | null
  pending: boolean
  consume_reason: 'drunk' | 'sold' | 'lost' | 'gifted' | null
}
```

Also update the `Insert` type for bottles in the `Database` type to include `pending?`:
```typescript
Insert: Omit<Bottle, 'id' | 'added_at' | 'consumed_at'> & { added_at?: string; consumed_at?: string | null; pending?: boolean }
```

**Step 3: Commit**

```
git add app/src/types/database.ts
git commit -m "feat: add pending and consume_reason fields to Bottle type"
```

---

### Task 2: Reorder navigation tabs

**Files:**
- Modify: `app/src/App.tsx:64-69` (nav links)

**Step 1: Reorder NavLinks**

Change the nav order from (Lijst, Wijnen, Dashboard, Locaties, Toevoegen) to (Dashboard, Wijnen, Lijst, Locaties, Toevoegen):

```tsx
<NavLink to="/dashboard" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Dashboard</NavLink>
<NavLink to="/wines" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Wijnen</NavLink>
<NavLink to="/" end className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Lijst</NavLink>
<NavLink to="/locations" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Locaties</NavLink>
<NavLink to="/add" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Toevoegen</NavLink>
```

Route `/` still renders `<WineList />` (unchanged).

**Step 2: Build check**

Run: `cd app && npm run build`
Expected: Success with no type errors.

**Step 3: Commit**

```
git add app/src/App.tsx
git commit -m "feat: reorder nav tabs — Dashboard, Wijnen, Lijst, Locaties, Toevoegen"
```

---

### Task 3: Update hooks — useConsumeBottle + useReceiveBottle

**Files:**
- Modify: `app/src/hooks/useBottles.ts:23-39` (useConsumeBottle)
- Modify: `app/src/hooks/useBottles.ts` (add useReceiveBottle and useReceiveAllBottles)

**Step 1: Update useConsumeBottle to accept reason + date**

Change the mutation to accept an object instead of just a bottleId:

```typescript
export function useConsumeBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      bottleId: string
      reason: 'drunk' | 'sold' | 'lost' | 'gifted'
      date: string // ISO date string
    }) => {
      const { error } = await supabase
        .from('bottles')
        .update({
          consumed_at: params.date,
          consume_reason: params.reason,
          slot_id: null,
        })
        .eq('id', params.bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['wine'] })
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['slot-detail'] })
      qc.invalidateQueries({ queryKey: ['unplaced-bottles'] })
    },
  })
}
```

**Step 2: Add useReceiveBottle hook**

```typescript
export function useReceiveBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bottleId: string) => {
      const { error } = await supabase
        .from('bottles')
        .update({ pending: false })
        .eq('id', bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['wine'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['unplaced-bottles'] })
    },
  })
}

export function useReceiveAllBottles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bottleIds: string[]) => {
      const { error } = await supabase
        .from('bottles')
        .update({ pending: false })
        .in('id', bottleIds)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['wine'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['unplaced-bottles'] })
    },
  })
}
```

**Step 3: Build check**

Run: `cd app && npm run build`
Expected: May have errors in files that call `consumeBottle.mutate(bottleId)` — these are fixed in later tasks.

**Step 4: Commit**

```
git add app/src/hooks/useBottles.ts
git commit -m "feat: useConsumeBottle accepts reason+date, add useReceiveBottle hooks"
```

---

### Task 4: Create ConsumeSheet component

**Files:**
- Create: `app/src/components/ConsumeSheet.tsx`

**Step 1: Create the ConsumeSheet component**

A bottom sheet that presents 4 reason options and a date picker. Reuses the same visual pattern as the existing SlotDetail bottom sheet.

```tsx
import { useState } from 'react'
import { useConsumeBottle } from '../hooks/useBottles'

type Props = {
  bottleId: string
  wineName: string
  onClose: () => void
}

const reasons = [
  { value: 'drunk' as const, label: 'Gedronken', icon: '🍷' },
  { value: 'sold' as const, label: 'Verkocht', icon: '💰' },
  { value: 'gifted' as const, label: 'Weggegeven', icon: '🎁' },
  { value: 'lost' as const, label: 'Verloren', icon: '❓' },
]

export default function ConsumeSheet({ bottleId, wineName, onClose }: Props) {
  const [reason, setReason] = useState<'drunk' | 'sold' | 'lost' | 'gifted'>('drunk')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const consumeMutation = useConsumeBottle()

  function handleConfirm() {
    consumeMutation.mutate(
      { bottleId, reason, date: new Date(date).toISOString() },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl animate-slide-up">
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          <h3 className="font-semibold text-lg">Fles verwijderen</h3>
          <p className="text-sm text-stone-500 truncate">{wineName}</p>

          {/* Reason buttons */}
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  reason === r.value
                    ? 'border-red-800 bg-red-50 text-red-800'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
            />
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={consumeMutation.isPending}
              className="w-full py-2.5 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {consumeMutation.isPending ? 'Bezig...' : 'Bevestigen'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 active:scale-[0.99] transition-all"
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Build check**

Run: `cd app && npm run build`

**Step 3: Commit**

```
git add app/src/components/ConsumeSheet.tsx
git commit -m "feat: add ConsumeSheet component with reason + date picker"
```

---

### Task 5: Update SlotDetail to use ConsumeSheet

**Files:**
- Modify: `app/src/components/SlotDetail.tsx`

**Step 1: Replace direct consume with ConsumeSheet**

Add state for which bottle is being consumed:
```typescript
const [consumingBottle, setConsumingBottle] = useState<{ id: string; wineName: string } | null>(null)
```

Replace the "Gedronken" button's onClick from:
```tsx
onClick={() => consumeMutation.mutate(group.bottles[0].id)}
```
to:
```tsx
onClick={() => setConsumingBottle({ id: group.bottles[0].id, wineName: group.wine?.name ?? 'Onbekende wijn' })}
```

Remove the `consumeMutation` import/usage (no longer called directly). Remove `useConsumeBottle` from the imports.

Add ConsumeSheet rendering inside the fragment (after the panel div):
```tsx
{consumingBottle && (
  <ConsumeSheet
    bottleId={consumingBottle.id}
    wineName={consumingBottle.wineName}
    onClose={() => setConsumingBottle(null)}
  />
)}
```

Import ConsumeSheet:
```typescript
import ConsumeSheet from './ConsumeSheet'
```

**Step 2: Build check**

Run: `cd app && npm run build`

**Step 3: Commit**

```
git add app/src/components/SlotDetail.tsx
git commit -m "feat: SlotDetail uses ConsumeSheet instead of direct consume"
```

---

### Task 6: Update WineDetail to use ConsumeSheet + show pending bottles

**Files:**
- Modify: `app/src/pages/WineDetail.tsx`

**Step 1: Add ConsumeSheet integration**

Replace `handleConsume` function. Add state:
```typescript
const [consumingBottleId, setConsumingBottleId] = useState<string | null>(null)
```

Remove the `handleConsume` function and the `confirm()` call.

Change "Gedronken" button onClick to:
```tsx
onClick={() => setConsumingBottleId(bottle.id)}
```

Add ConsumeSheet at the end of the component return:
```tsx
{consumingBottleId && (
  <ConsumeSheet
    bottleId={consumingBottleId}
    wineName={w.name}
    onClose={() => setConsumingBottleId(null)}
  />
)}
```

**Step 2: Add pending bottles section**

Add `useReceiveBottle` and `useReceiveAllBottles` imports. Split bottles into three groups:
```typescript
const activeBottles = w.bottles.filter((b) => !b.consumed_at && !b.pending)
const pendingBottles = w.bottles.filter((b) => !b.consumed_at && b.pending)
const consumedBottles = w.bottles.filter((b) => b.consumed_at)
```

Update the heading:
```tsx
<h2 className="font-semibold text-lg">
  Flessen ({activeBottles.length} op voorraad
  {pendingBottles.length > 0 ? `, ${pendingBottles.length} besteld` : ''}
  {consumedBottles.length > 0 ? `, ${consumedBottles.length} verwijderd` : ''})
</h2>
```

Add pending bottles section (between active and consumed):
```tsx
{pendingBottles.length > 0 && (
  <div className="space-y-1 mt-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-orange-600">Besteld</h3>
      {pendingBottles.length > 1 && (
        <button
          onClick={() => receiveAll.mutate(pendingBottles.map(b => b.id))}
          disabled={receiveAll.isPending}
          className="text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
        >
          Alle ontvangen ({pendingBottles.length})
        </button>
      )}
    </div>
    {pendingBottles.map((bottle) => (
      <div
        key={bottle.id}
        className="bg-orange-50 rounded-lg p-3 text-sm border border-orange-200 flex items-center justify-between"
      >
        <span className="text-orange-700">Besteld</span>
        <button
          onClick={() => receiveMutation.mutate(bottle.id)}
          disabled={receiveMutation.isPending}
          className="px-3 py-1 text-xs rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
        >
          Ontvangen
        </button>
      </div>
    ))}
  </div>
)}
```

Update consumed bottles to show reason:
```tsx
{consumedBottles.map((bottle) => (
  <div
    key={bottle.id}
    className="bg-stone-50 rounded-lg p-3 text-sm text-stone-400 border border-stone-100"
  >
    {bottle.consume_reason === 'sold' ? '💰 Verkocht' :
     bottle.consume_reason === 'gifted' ? '🎁 Weggegeven' :
     bottle.consume_reason === 'lost' ? '❓ Verloren' :
     '🍷 Gedronken'} op {new Date(bottle.consumed_at!).toLocaleDateString('nl-NL')}
  </div>
))}
```

**Step 3: Build check**

Run: `cd app && npm run build`

**Step 4: Commit**

```
git add app/src/pages/WineDetail.tsx
git commit -m "feat: WineDetail shows pending bottles with receive action, uses ConsumeSheet"
```

---

### Task 7: Update WineList to show pending count

**Files:**
- Modify: `app/src/pages/WineList.tsx`

**Step 1: Update bottle counting**

The `WineWithBottles` type already includes all bottles with `consumed_at` and `slot_id`. We need `pending` in the select. Update `useWines` hook first:

In `app/src/hooks/useWines.ts`, change the bottles select from:
```typescript
.select('*, bottles(id, slot_id, consumed_at)')
```
to:
```typescript
.select('*, bottles(id, slot_id, consumed_at, pending)')
```

Also update the `WineWithBottles` type:
```typescript
export type WineWithBottles = Wine & {
  bottles: Pick<Bottle, 'id' | 'slot_id' | 'consumed_at' | 'pending'>[]
}
```

**Step 2: Update WineList counting and display**

Change `getActiveBottles` to return both counts:
```typescript
function getBottleCounts(wine: WineWithBottles): { active: number; pending: number } {
  let active = 0
  let pending = 0
  for (const b of wine.bottles) {
    if (b.consumed_at) continue
    if (b.pending) pending++
    else active++
  }
  return { active, pending }
}
```

Update the `GroupedWine` type:
```typescript
type GroupedWine = {
  wine: WineWithBottles
  quantity: number
  pendingCount: number
}
```

Update the `sections` useMemo to use the new counting and include wines that have either active or pending:
```typescript
const active = allWines
  .map((w) => {
    const counts = getBottleCounts(w)
    return { wine: w, quantity: counts.active, pendingCount: counts.pending }
  })
  .filter((w) => w.quantity > 0 || w.pendingCount > 0)
```

Update the totalBottles line to just count active:
```typescript
const totalBottles = sections.reduce((sum, s) => sum + s.totalBottles, 0)
const totalPending = sections.reduce((sum, s) =>
  sum + s.colors.reduce((cs, c) =>
    cs + c.countries.reduce((ccs, co) =>
      ccs + co.regions.reduce((rs, r) =>
        rs + r.wines.reduce((ws, w) => ws + w.pendingCount, 0), 0), 0), 0), 0)
```

Update header text:
```tsx
<p className="text-sm text-stone-500 mt-1">
  {totalBottles} flessen op voorraad
  {totalPending > 0 && <span className="text-orange-500"> + {totalPending} besteld</span>}
</p>
```

Update wine entry quantity display:
```tsx
<span className="text-sm text-stone-500 shrink-0 tabular-nums text-right">
  {gw.quantity}
  {gw.pendingCount > 0 && (
    <span className="text-orange-500"> +{gw.pendingCount}</span>
  )}
  {(gw.wine.drink_from || gw.wine.drink_until) && (
    <span className="text-stone-400">
      , {gw.wine.drink_from ?? '?'}–{gw.wine.drink_until ?? '?'}
    </span>
  )}
</span>
```

**Step 3: Build check**

Run: `cd app && npm run build`

**Step 4: Commit**

```
git add app/src/hooks/useWines.ts app/src/pages/WineList.tsx
git commit -m "feat: WineList shows pending bottle count with orange indicator"
```

---

### Task 8: Update Dashboard — pending count + consume reasons

**Files:**
- Modify: `app/src/hooks/useDashboard.ts`
- Modify: `app/src/pages/Dashboard.tsx`

**Step 1: Update useDashboard to exclude pending and count them**

In `useDashboard.ts`, update the bottles select to include `pending`:
```typescript
.select('id, slot_id, consumed_at, pending, wine:wines(id, name, color, country, region, vintage, price, estimated_value, drink_from, drink_until, varietal), slot:slots(location:locations(id, name, type))')
```

After fetching, split active from pending:
```typescript
const allActive = (allBottles ?? []).filter((b: any) => !b.pending)
const pendingBottles = (allBottles ?? []).filter((b: any) => b.pending)
const bottles = allActive // rest of the stats use only non-pending
```

Add `pendingCount: pendingBottles.length` to the return object.

Update recentConsumed select to include consume_reason:
```typescript
.select('*, wine:wines(*)')
```
(already selects `*`, so `consume_reason` is included automatically)

**Step 2: Update Dashboard.tsx**

Add pending indicator below the total count:
```tsx
{data.pendingCount > 0 && (
  <div className="text-sm text-orange-500 mt-1">
    + {data.pendingCount} besteld
  </div>
)}
```

Update "Recent gedronken" to "Recent verwijderd" with reason icons:
```tsx
<h2 className="text-lg font-semibold mb-2">Recent verwijderd</h2>
...
{data.recentConsumed.map((bottle: any) => (
  <div key={bottle.id} className="bg-white rounded-lg p-3 shadow-sm border border-stone-200 text-sm">
    <span className="mr-1.5">
      {bottle.consume_reason === 'sold' ? '💰' :
       bottle.consume_reason === 'gifted' ? '🎁' :
       bottle.consume_reason === 'lost' ? '❓' : '🍷'}
    </span>
    <span className="font-medium">{bottle.wine.name}</span>
    {bottle.wine.vintage && <span className="text-stone-500 ml-1">{bottle.wine.vintage}</span>}
    <span className="text-stone-400 ml-2">
      {new Date(bottle.consumed_at).toLocaleDateString('nl-NL')}
    </span>
  </div>
))}
```

**Step 3: Build check**

Run: `cd app && npm run build`

**Step 4: Commit**

```
git add app/src/hooks/useDashboard.ts app/src/pages/Dashboard.tsx
git commit -m "feat: Dashboard excludes pending from totals, shows consume reasons"
```

---

### Task 9: CSV Import — pending toggle

**Files:**
- Modify: `app/src/pages/AddWine.tsx` (CsvImport function)

**Step 1: Add pending toggle state**

In `CsvImport()`, add:
```typescript
const [isPending, setIsPending] = useState(false)
```

**Step 2: Add toggle UI**

After the import mode toggle, add:
```tsx
<label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
  <input
    type="checkbox"
    checked={isPending}
    onChange={(e) => setIsPending(e.target.checked)}
    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500/30"
  />
  Dit zijn bestelde (pending) flessen
</label>
```

**Step 3: Pass pending flag to bottle creation**

In `handleImport`, everywhere bottles are created via `supabase.from('bottles').insert(...)`, add `pending: isPending` to each bottle object.

For sync mode new bottles:
```typescript
const newBottles = Array.from({ length: toAdd }, () => ({
  wine_id: existingWineId,
  slot_id: null,
  pending: isPending,
}))
```

For sync mode new wine bottles:
```typescript
const bottles = Array.from({ length: item.quantity }, () => ({
  wine_id: wine.id,
  slot_id: null,
  pending: isPending,
}))
```

For add mode:
```typescript
const bottles = Array.from({ length: item.quantity }, () => ({
  wine_id: wine.id,
  slot_id: null,
  pending: isPending,
}))
```

**Step 4: Build check**

Run: `cd app && npm run build`

**Step 5: Commit**

```
git add app/src/pages/AddWine.tsx
git commit -m "feat: CSV import has pending toggle for marking imported bottles as ordered"
```

---

### Task 10: Final build + push

**Step 1: Full build**

Run: `cd app && npm run build`
Expected: Clean build with no errors.

**Step 2: Push**

```
git push
```
