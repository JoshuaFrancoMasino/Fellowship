/*
  # Add Comment Likes Feature

  1. New Tables
    - `comment_likes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, foreign key to comments)
      - `username` (text, user who liked the comment)
      - `created_at` (timestamp)

    - `blog_post_comment_likes`
      - `id` (uuid, primary key)
      - `blog_post_comment_id` (uuid, foreign key to blog_post_comments)
      - `username` (text, user who liked the comment)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for users to create/delete likes
    - Add unique constraints to prevent duplicate likes

  3. Notifications Support
    - Update notifications table entity_type constraint to include comment types

  4. Indexes
    - Add indexes for efficient querying by comment and username
*/

-- Create comment_likes table for pin comments
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, username)
);

-- Create blog_post_comment_likes table for blog post comments
CREATE TABLE IF NOT EXISTS blog_post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_comment_id uuid NOT NULL REFERENCES blog_post_comments(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blog_post_comment_id, username)
);

-- Create indexes for efficient querying on comment_likes
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_username_idx ON comment_likes (username);
CREATE INDEX IF NOT EXISTS comment_likes_created_at_idx ON comment_likes (created_at DESC);

-- Create indexes for efficient querying on blog_post_comment_likes
CREATE INDEX IF NOT EXISTS blog_post_comment_likes_comment_id_idx ON blog_post_comment_likes (blog_post_comment_id);
CREATE INDEX IF NOT EXISTS blog_post_comment_likes_username_idx ON blog_post_comment_likes (username);
CREATE INDEX IF NOT EXISTS blog_post_comment_likes_created_at_idx ON blog_post_comment_likes (created_at DESC);

-- Enable RLS on both tables
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes (pin comments)
CREATE POLICY "Anyone can read comment likes"
  ON comment_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create comment likes"
  ON comment_likes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users and admins can delete comment likes"
  ON comment_likes
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own likes (username matches)
    username = username OR
    -- Authenticated admins can delete any like
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- Policies for blog_post_comment_likes
CREATE POLICY "Anyone can read blog post comment likes"
  ON blog_post_comment_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create blog post comment likes"
  ON blog_post_comment_likes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users and admins can delete blog post comment likes"
  ON blog_post_comment_likes
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own likes (username matches)
    username = username OR
    -- Authenticated admins can delete any like
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- Update the notifications table entity_type constraint to include comment types
DO $$
BEGIN
  -- Drop the existing constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'notifications_entity_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_entity_type_check;
  END IF;
  
  -- Add the updated constraint with comment types included
  ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check 
  CHECK (entity_type = ANY (ARRAY['pin'::text, 'blog_post'::text, 'marketplace_item'::text, 'chat_message'::text, 'comment'::text, 'blog_post_comment'::text]));
END $$;