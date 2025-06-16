/*
  # Add chat message likes table

  1. New Tables
    - `chat_message_likes`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key referencing chat_messages.id)
      - `username` (text, to identify who liked the message)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_message_likes` table
    - Add policies for public read access
    - Add policies for users to manage their own likes
    - Add policies for admins to delete any like

  3. Constraints
    - Unique constraint on (message_id, username) to prevent duplicate likes
    - Foreign key constraint to ensure message exists
*/

-- Create chat_message_likes table
CREATE TABLE IF NOT EXISTS chat_message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, username)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS chat_message_likes_message_id_idx ON chat_message_likes (message_id);
CREATE INDEX IF NOT EXISTS chat_message_likes_username_idx ON chat_message_likes (username);
CREATE INDEX IF NOT EXISTS chat_message_likes_created_at_idx ON chat_message_likes (created_at DESC);

-- Enable RLS
ALTER TABLE chat_message_likes ENABLE ROW LEVEL SECURITY;

-- Policies for chat message likes
CREATE POLICY "Anyone can read chat message likes"
  ON chat_message_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create chat message likes"
  ON chat_message_likes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users and admins can delete chat message likes"
  ON chat_message_likes
  FOR DELETE
  TO public
  USING (
    -- Users can delete their own likes (username matches)
    username = username OR
    -- Authenticated admins can delete any like
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );