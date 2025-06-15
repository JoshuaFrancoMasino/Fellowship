/*
  # Fix chat messages pin_id column type

  1. Changes
    - Drop foreign key constraint on chat_messages.pin_id
    - Change pin_id column type from uuid to text
    - This allows using string conversation IDs like "dm_user1_user2"

  2. Security
    - Maintains existing RLS policies
*/

-- Drop the foreign key constraint first
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pin_id_fkey;

-- Change the pin_id column type from uuid to text
ALTER TABLE chat_messages ALTER COLUMN pin_id TYPE text;

-- Update any existing indexes to work with text type
DROP INDEX IF EXISTS chat_messages_pin_id_created_at_idx;
CREATE INDEX chat_messages_pin_id_created_at_idx ON public.chat_messages USING btree (pin_id, created_at DESC);