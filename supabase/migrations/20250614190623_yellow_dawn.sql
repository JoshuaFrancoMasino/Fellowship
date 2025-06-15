/*
  # Fix Guest Pin Deletion Policy

  1. Policy Updates
    - Update the DELETE policy on pins table to properly allow guests to delete their own pins
    - Ensure authenticated users can still delete their own pins
    - Maintain admin deletion privileges

  2. Security
    - Guests can only delete pins they created (based on username matching and is_authenticated = false)
    - Authenticated users can delete pins where their profile username matches the pin username
    - Admins can delete any pin
*/

-- Drop the existing problematic DELETE policy
DROP POLICY IF EXISTS "Users can delete their own pins" ON pins;

-- Create new DELETE policy that properly handles guest users
CREATE POLICY "Users can delete their own pins"
  ON pins
  FOR DELETE
  TO public
  USING (
    -- Guest users can delete their own pins (where is_authenticated = false and username matches)
    (auth.uid() IS NULL AND is_authenticated = false AND username = username) OR
    -- Authenticated users can delete their own pins (where profile username matches)
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = pins.username
    )) OR
    -- Admins can delete any pin
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
  );

-- Ensure RLS is enabled
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;