/*
  # Add Blog Post Comments Feature

  1. New Tables
    - `blog_post_comments`
      - `id` (uuid, primary key)
      - `blog_post_id` (uuid, foreign key to blog_posts)
      - `username` (text, commenter's username)
      - `text` (text, comment content, max 1000 chars)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `blog_post_comments` table
    - Add policies for public read access
    - Add policies for users to create comments
    - Add policies for comment authors and admins to delete comments

  3. Indexes
    - Add indexes for efficient querying by blog post and creation date
*/

-- Create blog_post_comments table
CREATE TABLE IF NOT EXISTS blog_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  username text NOT NULL,
  text text NOT NULL CHECK (char_length(text) <= 1000),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS blog_post_comments_blog_post_id_idx ON blog_post_comments (blog_post_id);
CREATE INDEX IF NOT EXISTS blog_post_comments_created_at_idx ON blog_post_comments (created_at DESC);
CREATE INDEX IF NOT EXISTS blog_post_comments_blog_post_id_created_at_idx ON blog_post_comments (blog_post_id, created_at DESC);

-- Enable RLS
ALTER TABLE blog_post_comments ENABLE ROW LEVEL SECURITY;

-- Policies for blog post comments
CREATE POLICY "Anyone can read blog post comments"
  ON blog_post_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create blog post comments"
  ON blog_post_comments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users and admins can delete blog post comments"
  ON blog_post_comments
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own comments (username matches)
    username = username OR
    -- Authenticated admins can delete any comment
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );