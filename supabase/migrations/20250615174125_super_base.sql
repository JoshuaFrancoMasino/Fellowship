/*
  # Add Admin Policies for Marketplace Items

  1. Policy Updates
    - Drop existing admin policies if they exist to prevent conflicts
    - Add admin update policy for marketplace items
    - Add admin delete policy for marketplace items

  2. Security
    - Admins can update any marketplace item
    - Admins can delete any marketplace item
    - Uses existing is_admin() function for admin checks
*/

-- Drop existing admin policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Admins can update any marketplace item" ON marketplace_items;
DROP POLICY IF EXISTS "Admins can delete any marketplace item" ON marketplace_items;

-- Add admin update policy for marketplace items
CREATE POLICY "Admins can update any marketplace item"
  ON marketplace_items
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
  );

-- Add admin delete policy for marketplace items
CREATE POLICY "Admins can delete any marketplace item"
  ON marketplace_items
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
  );