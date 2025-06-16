/*
  # Create public_profiles view

  1. New Views
    - `public_profiles`
      - Exposes publicly accessible profile information
      - Includes `id`, `username`, `profile_picture_url`, `about_me`, `contact_info`
      - Excludes sensitive fields like `role`
  
  2. Security
    - View only exposes non-sensitive profile data
    - Can be queried by public for displaying user information
    - Maintains privacy by not exposing admin roles or other sensitive data
*/

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  profile_picture_url,
  about_me,
  contact_info,
  created_at
FROM
  public.profiles;

-- Grant read access to the view for public users
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;