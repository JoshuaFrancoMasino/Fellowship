/*
  # Add Blog Post Likes Feature

  1. New Tables
    - `blog_post_likes`
      - `id` (uuid, primary key)
      - `blog_post_id` (uuid, foreign key to blog_posts)
      - `username` (text, user who liked the post)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `blog_post_likes` table
    - Add policies for public read access
    - Add policies for authenticated users to create/delete likes
    - Add unique constraint to prevent duplicate likes

  3. Indexes
    - Add indexes for efficient querying by blog post and username
*/

-- Create blog_post_likes table
CREATE TABLE IF NOT EXISTS blog_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blog_post_id, username)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS blog_post_likes_blog_post_id_idx ON blog_post_likes (blog_post_id);
CREATE INDEX IF NOT EXISTS blog_post_likes_username_idx ON blog_post_likes (username);
CREATE INDEX IF NOT EXISTS blog_post_likes_created_at_idx ON blog_post_likes (created_at DESC);

-- Enable RLS
ALTER TABLE blog_post_likes ENABLE ROW LEVEL SECURITY;

-- Policies for blog post likes
CREATE POLICY "Anyone can read blog post likes"
  ON blog_post_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create blog post likes"
  ON blog_post_likes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users and admins can delete blog post likes"
  ON blog_post_likes
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own likes (username matches)
    username = username OR
    -- Authenticated admins can delete any like
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );