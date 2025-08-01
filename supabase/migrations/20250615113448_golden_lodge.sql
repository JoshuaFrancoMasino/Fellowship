/*
  # Add location columns to pins table

  1. Changes
    - Add `continent` column (text, nullable)
    - Add `country` column (text, nullable) 
    - Add `state` column (text, nullable)
    - Add `locality` column (text, nullable)

  2. Notes
    - These columns will store geocoded location data for pins
    - All columns are nullable to maintain compatibility with existing pins
    - No indexes added initially as these are primarily for display purposes
*/

-- Add location columns to pins table
DO $$
BEGIN
  -- Add continent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'continent'
  ) THEN
    ALTER TABLE pins ADD COLUMN continent text;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'country'
  ) THEN
    ALTER TABLE pins ADD COLUMN country text;
  END IF;

  -- Add state column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'state'
  ) THEN
    ALTER TABLE pins ADD COLUMN state text;
  END IF;

  -- Add locality column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'locality'
  ) THEN
    ALTER TABLE pins ADD COLUMN locality text;
  END IF;
END $$;