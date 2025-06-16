/*
  # Add Editor's Choice feature

  1. New Columns
    - Add `is_editor_choice` (boolean, default false) to `pins` table
    - Add `is_editor_choice` (boolean, default false) to `marketplace_items` table  
    - Add `is_editor_choice` (boolean, default false) to `blog_posts` table

  2. Security
    - Admin update policy for blog posts (to allow admins to set editor's choice)
    - Existing admin policies for pins and marketplace_items already cover this

  3. Notes
    - Editor's choice items will be prioritized at the top of results
    - Only admins can set/unset editor's choice status
    - All columns default to false for existing content
*/

-- Add is_editor_choice column to pins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'is_editor_choice'
  ) THEN
    ALTER TABLE pins ADD COLUMN is_editor_choice boolean DEFAULT false;
  END IF;
END $$;

-- Add is_editor_choice column to marketplace_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_items' AND column_name = 'is_editor_choice'
  ) THEN
    ALTER TABLE marketplace_items ADD COLUMN is_editor_choice boolean DEFAULT false;
  END IF;
END $$;

-- Add is_editor_choice column to blog_posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'is_editor_choice'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN is_editor_choice boolean DEFAULT false;
  END IF;
END $$;

-- Add admin update policy for blog posts (if it doesn't exist)
DO $$
BEGIN
  -- Check if admin update policy exists for blog posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'blog_posts' 
    AND policyname = 'Admins can update any blog post'
  ) THEN
    CREATE POLICY "Admins can update any blog post"
      ON blog_posts
      FOR UPDATE
      TO authenticated
      USING (
        (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
      );
  END IF;
END $$;

-- Update existing records to ensure they have the default value
UPDATE pins SET is_editor_choice = false WHERE is_editor_choice IS NULL;
UPDATE marketplace_items SET is_editor_choice = false WHERE is_editor_choice IS NULL;
UPDATE blog_posts SET is_editor_choice = false WHERE is_editor_choice IS NULL;

-- Add indexes for efficient querying of editor's choice items
CREATE INDEX IF NOT EXISTS pins_editor_choice_idx ON pins (is_editor_choice, created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_items_editor_choice_idx ON marketplace_items (is_editor_choice, created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_editor_choice_idx ON blog_posts (is_editor_choice, created_at DESC);