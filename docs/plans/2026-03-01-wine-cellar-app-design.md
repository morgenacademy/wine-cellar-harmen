# Wine Cellar App - Design Document

## Problem

268 flessen wijn verspreid over 5 opslaglocaties (Billy-kast, 2 rekken, koelkast, kistje). Geen manier om snel te vinden waar een specifieke fles ligt, voorraad bij te houden na het drinken, of logisch te organiseren.

## Solution

Responsive web app (PWA) met visuele plattegrond van alle opslaglocaties, zoek/filter, en slimme indelingssuggesties.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, PWA
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Hosting:** Vercel of Netlify (gratis)

## Data Model

### locations
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | e.g. "Kast kolom 2", "Woonkamer rek" |
| type | enum | kast, rek, koelkast, kistje |
| sort_order | int | Display ordering |

### slots
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| location_id | uuid | FK -> locations |
| position | int | Position within location (top-to-bottom, left-to-right) |
| capacity | int | Max bottles that fit |
| label | text | Optional label, e.g. "Onderste vak" |

### wines
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Full wine name |
| producer | text | |
| vintage | int | nullable (NV wines) |
| color | enum | red, white, rosé, other |
| country | text | |
| region | text | |
| subregion | text | |
| appellation | text | |
| varietal | text | |
| designation | text | e.g. "Grosses Gewachs" |
| drink_from | int | Year, nullable |
| drink_until | int | Year, nullable |
| price | decimal | |
| notes | text | |
| cellartracker_id | text | For linking back to CT |

### bottles
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| wine_id | uuid | FK -> wines |
| slot_id | uuid | FK -> slots, nullable (unplaced) |
| added_at | timestamp | When added to cellar |
| consumed_at | timestamp | null = still in cellar |

## Storage Locations & Capacities

### Kast bij entree (Billy shelves, 4 columns)
Best storage: least daylight. Long-term aging wines.

```
Kolom:    1              2              3              4
        +------------+------------+------------+------------+
Row 1   | Balk       | Decanteer  | Bierglazen | Opslag     |
        +------------+------------+------------+------------+
Row 2   | Wijnglazen | Champagne  | Wijnkoeler | Opslag     |
        | rood       | glazen     |            | 11-12 fl   |
        +------------+------------+------------+------------+
Row 3   | Wijnglazen | Champagne  | 4-5 fl     | 4-5 fl     |
        | wit        | staand     | 11-12 fl   | 11-12 fl   |
        +------------+------------+------------+------------+
Row 4   | Waterglazen| 8 fl       | 8 fl       | 8 fl       |
        +------------+------------+------------+------------+
Row 5   | Theedoos   | 4-5 fl     | 4-5 fl     | 4-5 fl     |
        +------------+------------+------------+------------+
Row 6   | Kruiden    | 8 fl       | 8 fl       | 8 fl       |
        | 11-12 fl   |            |            |            |
        +------------+------------+------------+------------+
Row 7   |            | 8 fl       | 8 fl       | 8 fl       |
        +------------+------------+------------+------------+
Row 8   | 12 fl      | 12 fl      | 12 fl      | 12 fl      |
        +------------+------------+------------+------------+
```

### Woonkamer rek
Wall-mounted, 13 individual slots. Gets daily sun - use for short-term wines.

### Gang rek
Wall-mounted, 16 individual slots. Above Jeroen Bosch print.

### Koelkast
6 bottle capacity. White/rosé for immediate drinking.

### Kistje Brunello
3x Frescobaldi Brunello 2018. Stays as-is.

## Organization Strategy

**Principle:** protect valuable/aging wines, make daily picks easy.

- **Kast:** long-term storage, organized by country/region then producer
- **Rekken:** wines in their drinking window, ready to drink within 1-6 months
- **Koelkast:** white/rosé for this week
- **App suggests** placement based on color, region, and drinking window

## UI Screens

### 1. Dashboard
- Total bottle count per location
- "Drink soon" alerts (wines nearing end of drinking window)
- Recent activity (added/consumed)

### 2. Locations (visual map)
- Location picker: Kast / Woonkamer / Gang / Koelkast / Kistje
- **Kast:** interactive grid matching the Billy layout. Color-coded cells (red/white/rosé), click to drill into slot contents.
- **Rekken:** horizontal row of slots with bottle icons
- **Koelkast:** simple list
- Empty slots clearly visible

### 3. Wines (search & filter)
- Search bar + filters: color, country, region, varietal, drinking window
- Results show: name, vintage, quantity, location(s)
- Click -> wine detail with all bottles and their locations

### 4. Add Wine
- Manual form: name, producer, vintage, color, country, region, varietal, quantity, price
- CellarTracker CSV import
- After adding: app suggests slot placement

### Actions on bottles
- "Consumed" -> sets consumed_at, removes from slot
- "Move" -> pick new slot
- "Edit" -> modify wine info

## Future (nice-to-have)
- Wine list PDF export (a la CellarTracker)
- Barcode/label scanning
- Tasting notes & ratings
- Value tracking
