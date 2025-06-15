/*
  # Create blog posts table

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key)
      - `author_username` (text, references profiles.username)
      - `title` (text, max 200 chars)
      - `content` (text, max 10000 chars)
      - `excerpt` (text, max 500 chars, auto-generated from content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_published` (boolean, default false)
      - `view_count` (integer, default 0)

  2. Security
    - Enable RLS on `blog_posts` table
    - Add policies for public read access to published posts
    - Add policies for authenticated users to create posts
    - Add policies for authors to manage their own posts

  3. Indexes
    - Add indexes for efficient querying by author, publication status, and creation date
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_username text NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 200),
  content text NOT NULL CHECK (char_length(content) <= 10000),
  excerpt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS blog_posts_author_username_idx ON blog_posts (author_username);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_is_published_idx ON blog_posts (is_published);
CREATE INDEX IF NOT EXISTS blog_posts_published_created_at_idx ON blog_posts (is_published, created_at DESC);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies for blog posts
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts
  FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Authors can read their own blog posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = blog_posts.author_username
    )
  );

CREATE POLICY "Authenticated users can create blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = blog_posts.author_username
    )
  );

CREATE POLICY "Authors can update their own blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = blog_posts.author_username
    )
  );

CREATE POLICY "Authors can delete their own blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = blog_posts.author_username
    )
  );

-- Function to auto-generate excerpt from content
CREATE OR REPLACE FUNCTION generate_excerpt()
RETURNS trigger AS $$
BEGIN
  -- Generate excerpt from first 300 characters of content, ending at word boundary
  NEW.excerpt := CASE 
    WHEN char_length(NEW.content) <= 300 THEN NEW.content
    ELSE substring(NEW.content from 1 for 300) || '...'
  END;
  
  -- Update the updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate excerpt
CREATE TRIGGER blog_posts_generate_excerpt
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION generate_excerpt();