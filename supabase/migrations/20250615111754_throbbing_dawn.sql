/*
  # Add location fields to pins table

  1. New Columns
    - `continent` (text, nullable) - Continent name (e.g., "North America", "Europe")
    - `country` (text, nullable) - Country name (e.g., "United States", "Canada")
    - `state` (text, nullable) - State/Province name (e.g., "California", "Ontario")
    - `locality` (text, nullable) - City/Town name (e.g., "San Francisco", "Toronto")

  2. Indexes
    - Add indexes for efficient location-based filtering
    - Composite index for common location queries

  3. Notes
    - All location fields are nullable to maintain compatibility with existing pins
    - Location data will be populated via reverse geocoding during pin creation
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

-- Create indexes for efficient location-based filtering
CREATE INDEX IF NOT EXISTS pins_continent_idx ON pins (continent);
CREATE INDEX IF NOT EXISTS pins_country_idx ON pins (country);
CREATE INDEX IF NOT EXISTS pins_state_idx ON pins (state);
CREATE INDEX IF NOT EXISTS pins_locality_idx ON pins (locality);

-- Create composite index for common location queries
CREATE INDEX IF NOT EXISTS pins_location_composite_idx ON pins (country, state, locality);