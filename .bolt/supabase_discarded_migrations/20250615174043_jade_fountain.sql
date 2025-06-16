/*
  # Add Admin Policies for Marketplace Items

  1. New Policies
    - Add admin policies for marketplace items to allow admins to edit/delete any listing
    - Ensure existing seller policies remain intact

  2. Security
    - Admins can update any marketplace item
    - Admins can delete any marketplace item
    - Uses existing is_admin() function for admin checks
*/

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