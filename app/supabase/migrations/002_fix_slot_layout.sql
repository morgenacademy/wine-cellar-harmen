-- Champagne staand in Kolom 2: capacity is 12 (4 wide x 3 deep), not 4
UPDATE slots
SET capacity = 12
WHERE label = 'Champagne staand'
  AND location_id = (SELECT id FROM locations WHERE name = 'Kast kolom 2');

-- Kolom 1: wine slot moves from row 6 to row 7 (row 6 is kruiden only)
UPDATE slots
SET row_index = 7, label = 'Rij 7'
WHERE label = 'Rij 6 (boven)'
  AND location_id = (SELECT id FROM locations WHERE name = 'Kast kolom 1');
