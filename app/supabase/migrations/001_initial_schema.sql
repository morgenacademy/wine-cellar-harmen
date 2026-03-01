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
  row_index int,
  col_index int,
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

-- Indexes
create index idx_bottles_wine_id on bottles(wine_id);
create index idx_bottles_slot_id on bottles(slot_id);
create index idx_bottles_consumed on bottles(consumed_at) where consumed_at is null;
create index idx_slots_location on slots(location_id);
create index idx_wines_color on wines(color);
create index idx_wines_country on wines(country);

-- Seed locations
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
