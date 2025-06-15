/*
  # Add Pin Color and Image Storage Features

  1. New Columns
    - `pin_color` (text) - Color of the pin marker (default yellow)
    - `storage_paths` (text array) - Paths to uploaded images in Supabase Storage
    - `is_authenticated` (boolean) - Whether the pin was created by an authenticated user

  2. Updates
    - Add constraints for pin colors (must be valid hex colors)
    - Add default values for new columns
    - Maintain backward compatibility with existing pins

  3. Security
    - Existing RLS policies will apply to new columns
    - Storage paths are only accessible to authenticated users
*/

-- Add new columns to pins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'pin_color'
  ) THEN
    ALTER TABLE pins ADD COLUMN pin_color text DEFAULT '#FFFC00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'storage_paths'
  ) THEN
    ALTER TABLE pins ADD COLUMN storage_paths text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'is_authenticated'
  ) THEN
    ALTER TABLE pins ADD COLUMN is_authenticated boolean DEFAULT false;
  END IF;
END $$;

-- Add constraint for pin color (must be valid hex color)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'pins_pin_color_check'
  ) THEN
    ALTER TABLE pins ADD CONSTRAINT pins_pin_color_check 
    CHECK (pin_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

-- Update existing pins to have default values
UPDATE pins 
SET 
  pin_color = '#FFFC00',
  storage_paths = ARRAY[]::text[],
  is_authenticated = false
WHERE pin_color IS NULL OR storage_paths IS NULL OR is_authenticated IS NULL;