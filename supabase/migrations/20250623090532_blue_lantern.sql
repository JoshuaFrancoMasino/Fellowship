/*
  # Add Media Support to Chats and Comments (Fixed)

  1. New Columns
    - Add `media_url` (text, nullable) to `chat_messages` table
    - Add `media_url` (text, nullable) to `comments` table  
    - Add `media_url` (text, nullable) to `blog_post_comments` table

  2. Storage Bucket
    - Ensure 'chat-and-comment-media' bucket exists
    - Recreate storage policies to avoid conflicts

  3. Security
    - Users can upload media to their own folders
    - Anyone can view media (public read access)
    - Users can manage their own uploaded media
*/

-- Add media_url columns to existing tables
DO $$
BEGIN
  -- Add media_url to chat_messages table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN media_url text;
  END IF;

  -- Add media_url to comments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE comments ADD COLUMN media_url text;
  END IF;

  -- Add media_url to blog_post_comments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_post_comments' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE blog_post_comments ADD COLUMN media_url text;
  END IF;
END $$;

-- Create storage bucket for chat and comment media (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-and-comment-media', 'chat-and-comment-media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view chat and comment media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat and comment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat and comment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat and comment media" ON storage.objects;

-- Recreate storage policies for chat and comment media
CREATE POLICY "Anyone can view chat and comment media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-and-comment-media');

CREATE POLICY "Authenticated users can upload chat and comment media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-and-comment-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own chat and comment media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-and-comment-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own chat and comment media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-and-comment-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);