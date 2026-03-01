# Wine Cellar App - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a responsive PWA for tracking wine bottle locations across multiple storage spots, with visual maps, search/filter, and smart placement suggestions.

**Architecture:** React SPA (Vite) with Supabase backend. Four main views: Dashboard, Locations (visual grid/rack maps), Wines (search/filter list), and Add Wine (form + CSV import). Data flows through Supabase client with real-time subscriptions for cross-device sync. All state management via React Query + Supabase realtime.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, @supabase/supabase-js, @tanstack/react-query, Vitest + React Testing Library, vite-plugin-pwa

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Step 1: Scaffold Vite React-TS project**

```bash
cd /Users/harmen/Documents/Wines
npm create vite@latest app -- --template react-ts
cd app
```

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Configure Tailwind**

In `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

In `src/index.css`:
```css
@import "tailwindcss";
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

**Step 4: Create App shell with router**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-stone-50 text-stone-900">
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-2 md:static md:border-b md:border-t-0">
            <NavLink to="/" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Dashboard</NavLink>
            <NavLink to="/locations" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Locaties</NavLink>
            <NavLink to="/wines" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Wijnen</NavLink>
            <NavLink to="/add" className={({isActive}) => isActive ? 'text-red-800 font-bold' : 'text-stone-500'}>Toevoegen</NavLink>
          </nav>
          <main className="pb-20 md:pb-0 p-4 max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<div>Dashboard</div>} />
              <Route path="/locations/*" element={<div>Locaties</div>} />
              <Route path="/wines" element={<div>Wijnen</div>} />
              <Route path="/add" element={<div>Toevoegen</div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: App runs on localhost:5173, shows nav with 4 tabs.

**Step 6: Verify tests work**

Create `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders navigation', () => {
    render(<App />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Locaties')).toBeInTheDocument()
    expect(screen.getByText('Wijnen')).toBeInTheDocument()
    expect(screen.getByText('Toevoegen')).toBeInTheDocument()
  })
})
```

```bash
npx vitest run
```

Expected: 1 test passes.

**Step 7: Commit**

```bash
git init
echo "node_modules\ndist\n.env*" > .gitignore
git add .
git commit -m "feat: scaffold React + Vite + Tailwind + Supabase project"
```

---

## Task 2: Supabase Setup & Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase.ts`
- Create: `src/types/database.ts`
- Create: `.env.local` (not committed)

**Step 1: Create Supabase project**

Go to https://supabase.com, create account, create new project "wine-cellar".
Copy the project URL and anon key.

Create `app/.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

**Step 2: Write the migration SQL**

Create `app/supabase/migrations/001_initial_schema.sql`:
```sql
-- Locations: physical storage areas
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('kast', 'rek', 'koelkast', 'kistje')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Slots: individual positions within a location
create table slots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  position int not null,
  capacity int not null default 1,
  label text,
  row_index int, -- for grid layout (kast)
  col_index int, -- for grid layout (kast)
  created_at timestamptz not null default now(),
  unique (location_id, position)
);

-- Wines: unique wine entries
create table wines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  producer text,
  vintage int,
  color text not null check (color in ('red', 'white', 'rosé', 'other')),
  country text,
  region text,
  subregion text,
  appellation text,
  varietal text,
  designation text,
  drink_from int,
  drink_until int,
  price numeric(10,2),
  notes text,
  cellartracker_id text,
  created_at timestamptz not null default now()
);

-- Bottles: individual physical bottles
create table bottles (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references wines(id) on delete cascade,
  slot_id uuid references slots(id) on delete set null,
  added_at timestamptz not null default now(),
  consumed_at timestamptz
);

-- Indexes for common queries
create index idx_bottles_wine_id on bottles(wine_id);
create index idx_bottles_slot_id on bottles(slot_id);
create index idx_bottles_consumed on bottles(consumed_at) where consumed_at is null;
create index idx_slots_location on slots(location_id);
create index idx_wines_color on wines(color);
create index idx_wines_country on wines(country);

-- Seed data: locations and slots
insert into locations (name, type, sort_order) values
  ('Kast kolom 1', 'kast', 1),
  ('Kast kolom 2', 'kast', 2),
  ('Kast kolom 3', 'kast', 3),
  ('Kast kolom 4', 'kast', 4),
  ('Woonkamer rek', 'rek', 5),
  ('Gang rek', 'rek', 6),
  ('Koelkast', 'koelkast', 7),
  ('Kistje Brunello', 'kistje', 8);

-- Slots for Kast kolom 1 (only bottom 2 rows have wine)
-- Row 6 (11-12 bottles), Row 8 (12 bottles)
insert into slots (location_id, position, capacity, label, row_index, col_index)
select id, 1, 12, 'Rij 6 (boven)', 6, 1 from locations where name = 'Kast kolom 1'
union all
select id, 2, 12, 'Rij 8 (onder)', 8, 1 from locations where name = 'Kast kolom 1';

-- Slots for Kast kolom 2
insert into slots (location_id, position, capacity, label, row_index, col_index)
select id, 1, 4, 'Champagne staand', 3, 2 from locations where name = 'Kast kolom 2'
union all
select id, 2, 8, 'Rij 4', 4, 2 from locations where name = 'Kast kolom 2'
union all
select id, 3, 5, 'Rij 5', 5, 2 from locations where name = 'Kast kolom 2'
union all
select id, 4, 8, 'Rij 6', 6, 2 from locations where name = 'Kast kolom 2'
union all
select id, 5, 8, 'Rij 7', 7, 2 from locations where name = 'Kast kolom 2'
union all
select id, 6, 12, 'Rij 8 (onder)', 8, 2 from locations where name = 'Kast kolom 2';

-- Slots for Kast kolom 3
insert into slots (location_id, position, capacity, label, row_index, col_index)
select id, 1, 5, 'Rij 3 (boven)', 3, 3 from locations where name = 'Kast kolom 3'
union all
select id, 2, 12, 'Rij 3 (onder)', 3, 3 from locations where name = 'Kast kolom 3'
union all
select id, 3, 8, 'Rij 4', 4, 3 from locations where name = 'Kast kolom 3'
union all
select id, 4, 5, 'Rij 5', 5, 3 from locations where name = 'Kast kolom 3'
union all
select id, 5, 8, 'Rij 6', 6, 3 from locations where name = 'Kast kolom 3'
union all
select id, 6, 8, 'Rij 7', 7, 3 from locations where name = 'Kast kolom 3'
union all
select id, 7, 12, 'Rij 8 (onder)', 8, 3 from locations where name = 'Kast kolom 3';

-- Slots for Kast kolom 4
insert into slots (location_id, position, capacity, label, row_index, col_index)
select id, 1, 12, 'Rij 2', 2, 4 from locations where name = 'Kast kolom 4'
union all
select id, 2, 5, 'Rij 3 (boven)', 3, 4 from locations where name = 'Kast kolom 4'
union all
select id, 3, 12, 'Rij 3 (onder)', 3, 4 from locations where name = 'Kast kolom 4'
union all
select id, 4, 8, 'Rij 4', 4, 4 from locations where name = 'Kast kolom 4'
union all
select id, 5, 5, 'Rij 5', 5, 4 from locations where name = 'Kast kolom 4'
union all
select id, 6, 8, 'Rij 6', 6, 4 from locations where name = 'Kast kolom 4'
union all
select id, 7, 8, 'Rij 7', 7, 4 from locations where name = 'Kast kolom 4'
union all
select id, 8, 12, 'Rij 8 (onder)', 8, 4 from locations where name = 'Kast kolom 4';

-- Slots for woonkamer rek (13 individual)
insert into slots (location_id, position, capacity, label)
select id, generate_series(1, 13), 1, 'Slot ' || generate_series(1, 13)
from locations where name = 'Woonkamer rek';

-- Slots for gang rek (16 individual)
insert into slots (location_id, position, capacity, label)
select id, generate_series(1, 16), 1, 'Slot ' || generate_series(1, 16)
from locations where name = 'Gang rek';

-- Slots for koelkast (6 individual)
insert into slots (location_id, position, capacity, label)
select id, generate_series(1, 6), 1, 'Slot ' || generate_series(1, 6)
from locations where name = 'Koelkast';

-- Slot for kistje (1 slot, capacity 3)
insert into slots (location_id, position, capacity, label)
select id, 1, 3, 'Kistje'
from locations where name = 'Kistje Brunello';

-- Enable Row Level Security (allow all for now, no auth)
alter table locations enable row level security;
alter table slots enable row level security;
alter table wines enable row level security;
alter table bottles enable row level security;

create policy "Allow all on locations" on locations for all using (true) with check (true);
create policy "Allow all on slots" on slots for all using (true) with check (true);
create policy "Allow all on wines" on wines for all using (true) with check (true);
create policy "Allow all on bottles" on bottles for all using (true) with check (true);
```

**Step 3: Run migration in Supabase**

Go to Supabase Dashboard > SQL Editor > paste and run the migration SQL.

**Step 4: Create Supabase client**

Create `app/src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**Step 5: Generate TypeScript types**

Create `app/src/types/database.ts` with types matching the schema:
```ts
export type Location = {
  id: string
  name: string
  type: 'kast' | 'rek' | 'koelkast' | 'kistje'
  sort_order: number
}

export type Slot = {
  id: string
  location_id: string
  position: number
  capacity: number
  label: string | null
  row_index: number | null
  col_index: number | null
}

export type Wine = {
  id: string
  name: string
  producer: string | null
  vintage: number | null
  color: 'red' | 'white' | 'rosé' | 'other'
  country: string | null
  region: string | null
  subregion: string | null
  appellation: string | null
  varietal: string | null
  designation: string | null
  drink_from: number | null
  drink_until: number | null
  price: number | null
  notes: string | null
  cellartracker_id: string | null
}

export type Bottle = {
  id: string
  wine_id: string
  slot_id: string | null
  added_at: string
  consumed_at: string | null
}

// Joined types for queries
export type BottleWithWine = Bottle & { wine: Wine }
export type SlotWithBottles = Slot & { bottles: BottleWithWine[] }
export type LocationWithSlots = Location & { slots: SlotWithBottles[] }

export type Database = {
  public: {
    Tables: {
      locations: { Row: Location; Insert: Omit<Location, 'id'>; Update: Partial<Location> }
      slots: { Row: Slot; Insert: Omit<Slot, 'id'>; Update: Partial<Slot> }
      wines: { Row: Wine; Insert: Omit<Wine, 'id'>; Update: Partial<Wine> }
      bottles: { Row: Bottle; Insert: Omit<Bottle, 'id'>; Update: Partial<Bottle> }
    }
  }
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Supabase schema, migration, types, and client"
```

---

## Task 3: Data Hooks & API Layer

**Files:**
- Create: `src/hooks/useLocations.ts`
- Create: `src/hooks/useWines.ts`
- Create: `src/hooks/useBottles.ts`
- Test: `src/hooks/__tests__/useWines.test.ts`

**Step 1: Create location hooks**

`app/src/hooks/useLocations.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Location, Slot, BottleWithWine } from '../types/database'

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as Location[]
    },
  })
}

export function useLocationWithSlots(locationId: string) {
  return useQuery({
    queryKey: ['location', locationId],
    queryFn: async () => {
      const { data: slots, error: slotsError } = await supabase
        .from('slots')
        .select('*, bottles(*, wine:wines(*))')
        .eq('location_id', locationId)
        .order('position')
      if (slotsError) throw slotsError

      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single()
      if (locError) throw locError

      return { ...location, slots } as Location & { slots: (Slot & { bottles: BottleWithWine[] })[] }
    },
    enabled: !!locationId,
  })
}
```

**Step 2: Create wine hooks**

`app/src/hooks/useWines.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wine, BottleWithWine } from '../types/database'

type WineFilters = {
  search?: string
  color?: string
  country?: string
  region?: string
}

export function useWines(filters: WineFilters = {}) {
  return useQuery({
    queryKey: ['wines', filters],
    queryFn: async () => {
      let query = supabase
        .from('wines')
        .select('*, bottles(id, slot_id, consumed_at)')
        .order('name')

      if (filters.color) query = query.eq('color', filters.color)
      if (filters.country) query = query.eq('country', filters.country)
      if (filters.region) query = query.eq('region', filters.region)
      if (filters.search) query = query.ilike('name', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useWine(wineId: string) {
  return useQuery({
    queryKey: ['wine', wineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*, bottles(*, slot:slots(*, location:locations(*)))')
        .eq('id', wineId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!wineId,
  })
}

export function useAddWine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (wine: Omit<Wine, 'id'>) => {
      const { data, error } = await supabase.from('wines').insert(wine).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wines'] }),
  })
}
```

**Step 3: Create bottle hooks**

`app/src/hooks/useBottles.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAddBottles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { wine_id: string; slot_id?: string; count: number }) => {
      const bottles = Array.from({ length: params.count }, () => ({
        wine_id: params.wine_id,
        slot_id: params.slot_id ?? null,
      }))
      const { data, error } = await supabase.from('bottles').insert(bottles).select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['location'] })
    },
  })
}

export function useConsumeBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bottleId: string) => {
      const { error } = await supabase
        .from('bottles')
        .update({ consumed_at: new Date().toISOString(), slot_id: null })
        .eq('id', bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMoveBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { bottleId: string; slotId: string }) => {
      const { error } = await supabase
        .from('bottles')
        .update({ slot_id: params.slotId })
        .eq('id', params.bottleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location'] })
      qc.invalidateQueries({ queryKey: ['wines'] })
    },
  })
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add data hooks for locations, wines, and bottles"
```

---

## Task 4: Dashboard Screen

**Files:**
- Create: `src/pages/Dashboard.tsx`
- Create: `src/hooks/useDashboard.ts`
- Modify: `src/App.tsx` (wire up route)

**Step 1: Create dashboard hook**

`app/src/hooks/useDashboard.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // Bottles per location (active only)
      const { data: locationCounts } = await supabase
        .from('bottles')
        .select('slot:slots(location:locations(id, name, type))')
        .is('consumed_at', null)

      // Wines nearing end of drinking window (within 1 year)
      const currentYear = new Date().getFullYear()
      const { data: drinkSoon } = await supabase
        .from('wines')
        .select('*, bottles(id, consumed_at)')
        .lte('drink_until', currentYear + 1)
        .gte('drink_until', currentYear)

      // Recently consumed (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentConsumed } = await supabase
        .from('bottles')
        .select('*, wine:wines(*)')
        .not('consumed_at', 'is', null)
        .gte('consumed_at', thirtyDaysAgo)
        .order('consumed_at', { ascending: false })
        .limit(10)

      // Aggregate location counts
      const counts: Record<string, { name: string; type: string; count: number }> = {}
      let unplaced = 0
      locationCounts?.forEach((b: any) => {
        if (!b.slot?.location) { unplaced++; return }
        const loc = b.slot.location
        if (!counts[loc.id]) counts[loc.id] = { name: loc.name, type: loc.type, count: 0 }
        counts[loc.id].count++
      })

      return {
        totalBottles: locationCounts?.length ?? 0,
        locationCounts: Object.values(counts).sort((a, b) => b.count - a.count),
        unplaced,
        drinkSoon: drinkSoon?.filter(w => w.bottles?.some((b: any) => !b.consumed_at)) ?? [],
        recentConsumed: recentConsumed ?? [],
      }
    },
  })
}
```

**Step 2: Create Dashboard page**

`app/src/pages/Dashboard.tsx`:
```tsx
import { useDashboard } from '../hooks/useDashboard'

const colorMap: Record<string, string> = {
  kast: 'bg-amber-100 text-amber-800',
  rek: 'bg-stone-100 text-stone-800',
  koelkast: 'bg-blue-100 text-blue-800',
  kistje: 'bg-red-100 text-red-800',
}

export default function Dashboard() {
  const { data, isLoading } = useDashboard()

  if (isLoading) return <div className="p-4">Laden...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wijnkelder</h1>

      {/* Total count */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
        <div className="text-4xl font-bold text-red-800">{data.totalBottles}</div>
        <div className="text-stone-500">flessen in voorraad</div>
      </div>

      {/* Per location */}
      <div className="grid grid-cols-2 gap-3">
        {data.locationCounts.map((loc) => (
          <div key={loc.name} className={`rounded-xl p-4 ${colorMap[loc.type] ?? 'bg-stone-100'}`}>
            <div className="text-2xl font-bold">{loc.count}</div>
            <div className="text-sm">{loc.name}</div>
          </div>
        ))}
        {data.unplaced > 0 && (
          <div className="rounded-xl p-4 bg-yellow-100 text-yellow-800">
            <div className="text-2xl font-bold">{data.unplaced}</div>
            <div className="text-sm">Niet geplaatst</div>
          </div>
        )}
      </div>

      {/* Drink soon */}
      {data.drinkSoon.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Binnenkort drinken</h2>
          <div className="space-y-2">
            {data.drinkSoon.map((wine: any) => (
              <div key={wine.id} className="bg-white rounded-lg p-3 shadow-sm border border-orange-200">
                <div className="font-medium">{wine.name}</div>
                <div className="text-sm text-stone-500">
                  {wine.vintage} &middot; Drinken voor {wine.drink_until}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent consumed */}
      {data.recentConsumed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Recent gedronken</h2>
          <div className="space-y-2">
            {data.recentConsumed.map((bottle: any) => (
              <div key={bottle.id} className="bg-white rounded-lg p-3 shadow-sm border border-stone-200 text-sm">
                <span className="font-medium">{bottle.wine.name}</span>
                <span className="text-stone-400 ml-2">
                  {new Date(bottle.consumed_at).toLocaleDateString('nl-NL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Wire up in App.tsx**

Replace `<div>Dashboard</div>` with `<Dashboard />`, add import.

**Step 4: Verify in browser**

```bash
npm run dev
```

Expected: Dashboard loads, shows bottle counts (0 initially until CSV import).

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Dashboard page with bottle counts and drink-soon alerts"
```

---

## Task 5: Locations - Visual Kast Grid

**Files:**
- Create: `src/pages/Locations.tsx`
- Create: `src/components/KastGrid.tsx`
- Create: `src/components/RackView.tsx`
- Create: `src/components/SlotDetail.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Locations page with location picker**

`app/src/pages/Locations.tsx`:
```tsx
import { useState } from 'react'
import { useLocations } from '../hooks/useLocations'
import KastGrid from '../components/KastGrid'
import RackView from '../components/RackView'
import SlotDetail from '../components/SlotDetail'

export default function Locations() {
  const { data: locations, isLoading } = useLocations()
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  if (isLoading) return <div>Laden...</div>

  // Group kast locations together
  const kastLocations = locations?.filter(l => l.type === 'kast') ?? []
  const otherLocations = locations?.filter(l => l.type !== 'kast') ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Locaties</h1>

      {/* Location tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => { setSelectedLocationId('kast'); setSelectedSlotId(null) }}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${
            selectedLocationId === 'kast' ? 'bg-red-800 text-white' : 'bg-stone-200'
          }`}
        >
          Kast
        </button>
        {otherLocations.map(loc => (
          <button
            key={loc.id}
            onClick={() => { setSelectedLocationId(loc.id); setSelectedSlotId(null) }}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${
              selectedLocationId === loc.id ? 'bg-red-800 text-white' : 'bg-stone-200'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedLocationId === 'kast' && (
        <KastGrid locations={kastLocations} onSlotClick={setSelectedSlotId} />
      )}
      {selectedLocationId && selectedLocationId !== 'kast' && (
        <RackView locationId={selectedLocationId} onSlotClick={setSelectedSlotId} />
      )}

      {/* Slot detail drawer */}
      {selectedSlotId && (
        <SlotDetail slotId={selectedSlotId} onClose={() => setSelectedSlotId(null)} />
      )}
    </div>
  )
}
```

**Step 2: Create KastGrid component**

`app/src/components/KastGrid.tsx` - renders a 4-column grid matching the Billy layout. Each cell shows fill level with color coding. Non-wine cells (glazen, kruiden etc.) are greyed out.

**Step 3: Create RackView component**

`app/src/components/RackView.tsx` - renders a horizontal row of bottle slots for the rekken, simple list for koelkast/kistje.

**Step 4: Create SlotDetail component**

`app/src/components/SlotDetail.tsx` - slide-up panel showing bottles in a slot with "Gedronken" and "Verplaats" actions.

**Step 5: Wire up routes and verify**

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Locations page with kast grid, rack view, and slot detail"
```

---

## Task 6: Wines Search & Filter Page

**Files:**
- Create: `src/pages/Wines.tsx`
- Create: `src/pages/WineDetail.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Wines page with search and filters**

Search bar at top, filter chips for color/country/region, results as cards showing wine name, vintage, bottle count, and location summary.

**Step 2: Create WineDetail page**

Shows full wine info, all bottles with their locations, actions (consume, move).

**Step 3: Wire up routes**

Add `/wines/:id` route for wine detail.

**Step 4: Verify search and filtering works**

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Wines search page and wine detail view"
```

---

## Task 7: Add Wine & CSV Import

**Files:**
- Create: `src/pages/AddWine.tsx`
- Create: `src/lib/csv-import.ts`
- Test: `src/lib/__tests__/csv-import.test.ts`

**Step 1: Write CSV parser tests**

`app/src/lib/__tests__/csv-import.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseCellarTrackerCsv } from '../csv-import'

const sampleCsv = `"iWine","Type","Color","Category","Size","Currency","Value","Price","TotalQuantity","Quantity","Pending","Vintage","Wine","Locale","Producer","Varietal","MasterVarietal","Designation","Vineyard","Country","Region","SubRegion","Appellation","BeginConsume","EndConsume","WindowSource","CScore"
"4952293","White","White","Dry","750ml","EUR","11,0007","11","2","2","0","2022","J.J. Adeneuer Purist Blanc de Noir","Germany, Ahr","J.J. Adeneuer","Spätburgunder","Pinot Noir","Purist Blanc de Noir","Unknown","Germany","Ahr","Unknown","Unknown","2024","2026","Community Average","87"`

describe('parseCellarTrackerCsv', () => {
  it('parses a CellarTracker CSV row into wine + bottle count', () => {
    const results = parseCellarTrackerCsv(sampleCsv)
    expect(results).toHaveLength(1)
    expect(results[0].wine.name).toBe('J.J. Adeneuer Purist Blanc de Noir')
    expect(results[0].wine.color).toBe('white')
    expect(results[0].wine.vintage).toBe(2022)
    expect(results[0].wine.producer).toBe('J.J. Adeneuer')
    expect(results[0].wine.country).toBe('Germany')
    expect(results[0].wine.region).toBe('Ahr')
    expect(results[0].wine.drink_from).toBe(2024)
    expect(results[0].wine.drink_until).toBe(2026)
    expect(results[0].wine.cellartracker_id).toBe('4952293')
    expect(results[0].quantity).toBe(2)
  })

  it('maps color values correctly', () => {
    const roseCsv = sampleCsv.replace('"White","White"', '"Rosé","Rosé"')
    const results = parseCellarTrackerCsv(roseCsv)
    expect(results[0].wine.color).toBe('rosé')
  })

  it('handles 9999 as null drinking window', () => {
    const noWindow = sampleCsv.replace('"2024","2026"', '"9999","9999"')
    const results = parseCellarTrackerCsv(noWindow)
    expect(results[0].wine.drink_from).toBeNull()
    expect(results[0].wine.drink_until).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd app && npx vitest run src/lib/__tests__/csv-import.test.ts
```

Expected: FAIL - module not found.

**Step 3: Implement CSV parser**

`app/src/lib/csv-import.ts`:
```ts
import type { Wine } from '../types/database'

type CsvImportResult = {
  wine: Omit<Wine, 'id'>
  quantity: number
}

function mapColor(color: string): Wine['color'] {
  const lower = color.toLowerCase()
  if (lower.includes('rosé') || lower.includes('rose')) return 'rosé'
  if (lower.includes('red')) return 'red'
  if (lower.includes('white')) return 'white'
  return 'other'
}

function parseYear(val: string): number | null {
  const n = parseInt(val)
  if (isNaN(n) || n >= 9999) return null
  return n
}

function parsePrice(val: string): number | null {
  if (!val) return null
  const cleaned = val.replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export function parseCellarTrackerCsv(csvText: string): CsvImportResult[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const results: CsvImportResult[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    results.push({
      wine: {
        name: row['Wine'] ?? '',
        producer: row['Producer'] || null,
        vintage: parseYear(row['Vintage']),
        color: mapColor(row['Color'] ?? ''),
        country: row['Country'] || null,
        region: row['Region'] || null,
        subregion: row['SubRegion'] !== 'Unknown' ? row['SubRegion'] : null,
        appellation: row['Appellation'] !== 'Unknown' ? row['Appellation'] : null,
        varietal: row['Varietal'] || null,
        designation: row['Designation'] !== 'Unknown' ? row['Designation'] : null,
        drink_from: parseYear(row['BeginConsume']),
        drink_until: parseYear(row['EndConsume']),
        price: parsePrice(row['Price']),
        notes: null,
        cellartracker_id: row['iWine'] || null,
      },
      quantity: parseInt(row['Quantity']) || 0,
    })
  }

  return results.filter(r => r.quantity > 0)
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/csv-import.test.ts
```

Expected: 3 tests pass.

**Step 5: Create AddWine page**

`app/src/pages/AddWine.tsx` - tab component with "Handmatig" form and "CSV Import" file upload. CSV import shows preview of wines to import, then bulk-inserts into Supabase.

**Step 6: Wire up and verify**

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add wine form and CellarTracker CSV import"
```

---

## Task 8: Bottle Actions (Consume, Move)

**Files:**
- Modify: `src/components/SlotDetail.tsx`
- Create: `src/components/MoveBottleModal.tsx`
- Modify: `src/pages/WineDetail.tsx`

**Step 1: Add "Gedronken" button to SlotDetail and WineDetail**

Clicking marks bottle as consumed (sets `consumed_at`, clears `slot_id`).

**Step 2: Add "Verplaats" modal**

Shows location picker -> slot picker, then moves the bottle.

**Step 3: Verify actions work end-to-end**

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add consume and move bottle actions"
```

---

## Task 9: PWA Setup

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/` (generated)
- Modify: `vite.config.ts`

**Step 1: Install PWA plugin**

```bash
npm install -D vite-plugin-pwa
```

**Step 2: Configure manifest and service worker**

Add `vite-plugin-pwa` to Vite config with app name "Wijnkelder", theme color, and icon.

**Step 3: Add manifest.json**

```json
{
  "name": "Wijnkelder",
  "short_name": "Wijn",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafaf9",
  "theme_color": "#991b1b"
}
```

**Step 4: Verify PWA installable in browser**

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add PWA manifest and service worker"
```

---

## Task 10: Deploy & Initial Data Import

**Step 1: Deploy frontend to Vercel**

```bash
npm install -g vercel
cd app && vercel
```

Set environment variables in Vercel dashboard.

**Step 2: Import CellarTracker CSV**

Use the CSV import feature in the app to import `My Cellar.csv`.

**Step 3: Assign bottles to locations**

Use the app to place bottles in their correct slots (this is the manual initial setup).

**Step 4: Verify everything works on phone**

Open the Vercel URL on phone, install as PWA.

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: deployment config and initial data import"
```
