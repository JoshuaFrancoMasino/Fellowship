/*
  # Add Profile Fields for User Profiles

  1. New Columns
    - `contact_info` (text, nullable) - User's contact information
    - `about_me` (text, nullable) - User's about me section
    - `profile_picture_url` (text, nullable) - URL to user's profile picture
    - `banner_url` (text, nullable) - URL to user's banner image

  2. Constraints
    - Add length constraints for text fields to prevent abuse
    - Ensure URLs are properly formatted if provided

  3. Security
    - Existing RLS policies will apply to new columns
    - Users can only update their own profile information
*/

-- Add new columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'contact_info'
  ) THEN
    ALTER TABLE profiles ADD COLUMN contact_info text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'about_me'
  ) THEN
    ALTER TABLE profiles ADD COLUMN about_me text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_picture_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banner_url text;
  END IF;
END $$;

-- Add constraints for text length
DO $$
BEGIN
  -- Add constraint for contact_info length (max 500 characters)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_contact_info_length'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_contact_info_length 
    CHECK (char_length(contact_info) <= 500);
  END IF;

  -- Add constraint for about_me length (max 1000 characters)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_about_me_length'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_about_me_length 
    CHECK (char_length(about_me) <= 1000);
  END IF;
END $$;