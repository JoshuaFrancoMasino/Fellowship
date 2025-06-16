/*
  # Create public profiles view for publicly accessible profile data

  1. New View
    - `public_profiles` view exposing only public profile information:
      - `id` (uuid)
      - `username` (text)
      - `profile_picture_url` (text)

  2. Security
    - Enable RLS on the view
    - Add policy for public read access to the view
    - This allows anyone (including guests) to view usernames and profile pictures
    - Private data (role, contact_info, about_me, etc.) remains protected

  3. Purpose
    - Enables profile pictures to be displayed across the app publicly
    - Maintains privacy for sensitive profile information
    - Allows proper user identification in pins, comments, marketplace, etc.
*/

-- Create public profiles view with only publicly accessible data
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  profile_picture_url
FROM profiles;

-- Enable RLS on the view
ALTER VIEW public_profiles SET (security_invoker = true);

-- Create policy to allow public read access to the view
CREATE POLICY "Anyone can view public profile data"
  ON public_profiles
  FOR SELECT
  TO public
  USING (true);

-- Grant SELECT permission to public role
GRANT SELECT ON public_profiles TO public;
GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_profiles TO anon;