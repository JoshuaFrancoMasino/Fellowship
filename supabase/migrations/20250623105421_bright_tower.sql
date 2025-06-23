/*
  # Create forbidden usernames table

  1. New Tables
    - `forbidden_usernames`
      - `id` (uuid, primary key)
      - `word` (text, unique, forbidden word)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `forbidden_usernames` table
    - Add policies for admin-only access to forbidden words
    - Uses existing is_admin() function for permission checks

  3. Notes
    - Only admins can read, insert, update, or delete forbidden words
    - This table will be used to prevent users from signing up with inappropriate usernames
*/

-- Create forbidden_usernames table
CREATE TABLE IF NOT EXISTS forbidden_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE forbidden_usernames ENABLE ROW LEVEL SECURITY;

-- Policies for forbidden_usernames table
-- Only admins can read forbidden words
CREATE POLICY "Admins can read forbidden words"
  ON forbidden_usernames
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can insert forbidden words
CREATE POLICY "Admins can insert forbidden words"
  ON forbidden_usernames
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update forbidden words
CREATE POLICY "Admins can update forbidden words"
  ON forbidden_usernames
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can delete forbidden words
CREATE POLICY "Admins can delete forbidden words"
  ON forbidden_usernames
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Grant necessary permissions to the authenticated role for the is_admin function
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;