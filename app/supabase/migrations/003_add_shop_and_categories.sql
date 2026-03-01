-- Add shop (where purchased) column
ALTER TABLE wines ADD COLUMN shop text;

-- Expand color check constraint to include CellarTracker-style categories
ALTER TABLE wines DROP CONSTRAINT wines_color_check;
ALTER TABLE wines ADD CONSTRAINT wines_color_check
  CHECK (color IN ('red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'other'));
