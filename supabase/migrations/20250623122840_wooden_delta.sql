/*
  # Add chat message support to notifications

  1. Schema Updates
    - Update entity_type constraint to include 'chat_message'
    - This allows notifications for chat messages and chat message likes

  2. Security
    - Existing RLS policies will apply to chat message notifications
    - No changes needed to existing notification policies
*/

-- Update the entity_type check constraint to include 'chat_message'
DO $$
BEGIN
  -- Drop the existing constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'notifications_entity_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_entity_type_check;
  END IF;
  
  -- Add the updated constraint with 'chat_message' included
  ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check 
  CHECK (entity_type = ANY (ARRAY['pin'::text, 'blog_post'::text, 'marketplace_item'::text, 'chat_message'::text]));
END $$;