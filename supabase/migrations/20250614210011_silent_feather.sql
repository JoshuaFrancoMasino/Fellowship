/*
  # Fix Pin Creation Policy for Guest and Authenticated Users

  1. Policy Updates
    - Drop existing INSERT policies that may be too restrictive
    - Create or replace INSERT policy to allow both guest and authenticated users
    - Ensure proper authentication status validation

  2. Security
    - Guest users can create pins with is_authenticated = false
    - Authenticated users can create pins with is_authenticated = true
    - Prevent mismatched authentication status
*/

-- Drop any existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON pins;
DROP POLICY IF EXISTS "Anyone can create pins" ON pins;

-- Create new INSERT policy that allows both authenticated and guest users
CREATE POLICY "Anyone can create pins"
  ON pins
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure is_authenticated is set correctly based on auth status
    (auth.uid() IS NOT NULL AND is_authenticated = true) OR
    (auth.uid() IS NULL AND is_authenticated = false)
  );

-- Ensure RLS is enabled
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;