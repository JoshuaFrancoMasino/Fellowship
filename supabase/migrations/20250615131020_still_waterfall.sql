/*
  # Enable Admin Deletion for Blog Posts

  1. Policy Updates
    - Update the DELETE policy on blog_posts table to allow admins to delete any blog post
    - Maintain existing author deletion privileges
    - Use the existing is_admin() function for admin checks

  2. Security
    - Authors can still delete their own blog posts
    - Admins can delete any blog post
    - Non-admin users cannot delete posts they didn't create
*/

-- Drop the existing DELETE policy for blog posts
DROP POLICY IF EXISTS "Authors can delete their own blog posts" ON blog_posts;

-- Create new DELETE policy that allows both authors and admins to delete posts
CREATE POLICY "Authors and admins can delete blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (
    -- Authors can delete their own posts
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = blog_posts.author_username
    )) OR
    -- Admins can delete any post
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );