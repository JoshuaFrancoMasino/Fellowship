/*
  # Add chat messages table for real-time chat

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `pin_id` (uuid, foreign key to pins)
      - `username` (text, sender username)
      - `message` (text, message content)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for authenticated and anonymous users to read and create messages
    - Messages are tied to specific pins for location-based chat

  3. Real-time
    - Enable real-time subscriptions for the chat_messages table
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add constraint to limit message length
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_length CHECK (char_length(message) <= 500);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS chat_messages_pin_id_created_at_idx ON chat_messages(pin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat messages
CREATE POLICY "Anyone can read chat messages"
  ON chat_messages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create chat messages"
  ON chat_messages
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Enable real-time for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;