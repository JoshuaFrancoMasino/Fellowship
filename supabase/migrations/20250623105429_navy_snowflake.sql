/*
  # Update handle_new_user function for forbidden word checking

  1. New Functions
    - `contains_forbidden_word(text)` - Security definer function to check if username contains forbidden words
    
  2. Updated Functions
    - `handle_new_user()` - Now checks for forbidden words before creating profiles
    
  3. Security
    - Functions run with definer privileges to access forbidden_usernames table
    - Proper error handling for forbidden word violations
    - Maintains existing username uniqueness logic

  4. Notes
    - User creation will fail if username contains any forbidden word
    - Case-insensitive matching for forbidden words
    - Preserves all existing functionality for username generation
*/

-- Function to check if a username contains forbidden words
CREATE OR REPLACE FUNCTION public.contains_forbidden_word(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with definer privileges to access forbidden_usernames table
AS $$
DECLARE
  forbidden_word text;
BEGIN
  FOR forbidden_word IN SELECT word FROM public.forbidden_usernames LOOP
    IF p_username ILIKE '%' || forbidden_word || '%' THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (though it's called by a trigger, good practice)
GRANT EXECUTE ON FUNCTION public.contains_forbidden_word(text) TO authenticated;

-- Create or replace the function to handle new user profile creation with better uniqueness and forbidden word check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_username text;
  username_exists boolean;
  attempt_count integer := 0;
  max_attempts integer := 10;
BEGIN
  -- Check for forbidden words first
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL AND public.contains_forbidden_word(NEW.raw_user_meta_data->>'username') THEN
    RAISE EXCEPTION 'Username contains forbidden words.';
  END IF;

  -- Existing logic for username generation and uniqueness
  new_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );

  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = new_username) INTO username_exists;

    IF NOT username_exists THEN
      EXIT;
    END IF;

    attempt_count := attempt_count + 1;

    IF attempt_count >= max_attempts THEN
      new_username := 'user_' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;

    new_username := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      'user'
    ) || '_' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  INSERT INTO public.profiles (id, username, role, created_at, updated_at)
  VALUES (
    NEW.id,
    new_username,
    'user',
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    -- Re-raise the exception if it's a forbidden word error, otherwise just log and proceed
    IF SQLSTATE = 'P0001' THEN -- P0001 is the SQLSTATE for RAISE EXCEPTION
      RAISE;
    ELSE
      RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;

-- Add a helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile for new users with guaranteed unique username generation and forbidden word check';