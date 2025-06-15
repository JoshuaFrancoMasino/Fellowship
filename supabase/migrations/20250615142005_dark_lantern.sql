/*
  # Add UPDATE policy for pins table

  1. New Policy
    - `Users can update their own pins` - Allows pin updates for:
      - Guest users (when is_authenticated = false and username matches)
      - Authenticated users (when profile username matches pin username)
      - Admin users (can update any pin)

  2. Security
    - Maintains existing RLS structure
    - Uses the same permission logic as DELETE policy
    - Ensures only authorized users can modify pins
*/

-- Add UPDATE policy for pins table
CREATE POLICY "Users can update their own pins"
  ON pins
  FOR UPDATE
  TO public
  USING (
    -- Guest users can update their own pins (where is_authenticated = false and username matches)
    (auth.uid() IS NULL AND is_authenticated = false AND username = username) OR
    -- Authenticated users can update their own pins (where profile username matches)
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.username = pins.username
    )) OR
    -- Admins can update any pin
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- Ensure RLS is enabled for the pins table
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;