/*
  # Add delete policy for chat messages

  1. New Functions
    - `get_username_from_uuid(user_id uuid)` - Security definer function to get username from user ID
  
  2. New Policies
    - DELETE policy for chat_messages table allowing users to delete their own conversations
    - Admins can delete any conversation for moderation purposes

  3. Security
    - Function runs with definer privileges to bypass RLS during username lookup
    - Users can only delete messages from conversations they participate in
    - Admins can delete any messages
*/

-- Create a security definer function to get username from user ID
-- This function bypasses RLS when checking the profiles table
CREATE OR REPLACE FUNCTION public.get_username_from_uuid(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_username text;
BEGIN
  SELECT username INTO user_username
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN user_username;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_username_from_uuid(uuid) TO authenticated;

-- Add DELETE policy for chat messages
CREATE POLICY "Users can delete their own conversations"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete if they are one of the participants in the conversation
    (auth.uid() IS NOT NULL AND (
      pin_id LIKE '%_' || public.get_username_from_uuid(auth.uid()) || '_%' OR
      pin_id LIKE 'dm_' || public.get_username_from_uuid(auth.uid()) || '_%' OR
      pin_id LIKE '%_' || public.get_username_from_uuid(auth.uid())
    )) OR
    -- Admins can delete any conversation
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

-- Ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;