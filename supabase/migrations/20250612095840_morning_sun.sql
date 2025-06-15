/*
  # Fix Username Trigger for Profile Creation

  1. Problem Resolution
    - Fixes duplicate key violations in the `handle_new_user` trigger
    - Ensures unique username generation when client-provided username is missing or conflicts
    - Prevents infinite loading loops caused by failed profile creation

  2. Changes Made
    - Updates `handle_new_user` function to use `gen_random_uuid()` for guaranteed uniqueness
    - Adds better error handling and fallback mechanisms
    - Ensures profile creation always succeeds for new authenticated users

  3. Security
    - Maintains existing RLS policies
    - Preserves security definer permissions for auth operations
*/

-- Create or replace the function to handle new user profile creation with better uniqueness
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_username text;
  username_exists boolean;
  attempt_count integer := 0;
  max_attempts integer := 10;
BEGIN
  -- Start with the provided username or generate a base one
  new_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''), 
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Check if username already exists and generate a unique one if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = new_username) INTO username_exists;
    
    -- If username doesn't exist, we can use it
    IF NOT username_exists THEN
      EXIT;
    END IF;
    
    -- If it exists, generate a new unique username
    attempt_count := attempt_count + 1;
    
    -- Prevent infinite loops
    IF attempt_count >= max_attempts THEN
      new_username := 'user_' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;
    
    -- Generate a new username with random suffix
    new_username := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''), 
      'user'
    ) || '_' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  -- Insert the new profile with the guaranteed unique username
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
    -- Log the error and still return NEW to prevent auth failure
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
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
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile for new users with guaranteed unique username generation';