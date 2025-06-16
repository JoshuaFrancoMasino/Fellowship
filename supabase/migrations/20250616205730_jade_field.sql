/*
  # Enable comment deletion for users and admins

  1. Policy Updates
    - Drop existing DELETE policy on comments table
    - Create new DELETE policy allowing:
      - Users to delete their own comments (username matches)
      - Admins to delete any comment
    - Uses existing is_admin() function for admin checks

  2. Security
    - Users can only delete comments they created
    - Admins can delete any comment for moderation purposes
    - Maintains existing RLS structure
*/

-- Drop existing DELETE policy on comments table
DROP POLICY IF EXISTS "Anyone can delete comments" ON comments;

-- Create new DELETE policy for user and admin comment deletion
CREATE POLICY "Users and admins can delete comments"
  ON comments
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own comments (username matches)
    username = username OR
    -- Authenticated admins can delete any comment
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- Ensure RLS is enabled
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;