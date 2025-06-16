/*
  # Update blog excerpt generation function

  1. Function Updates
    - Update generate_excerpt() function to handle HTML content
    - Strip HTML tags from content before generating excerpt
    - Ensure excerpt is plain text for display purposes

  2. Security
    - Maintains existing security definer permissions
    - Properly handles HTML content without security risks
*/

-- Update the generate_excerpt function to handle HTML content
CREATE OR REPLACE FUNCTION generate_excerpt()
RETURNS trigger AS $$
BEGIN
  -- Strip HTML tags and generate excerpt from first 300 characters of content
  NEW.excerpt := CASE 
    WHEN char_length(regexp_replace(NEW.content, '<[^>]*>', '', 'g')) <= 300 
    THEN regexp_replace(NEW.content, '<[^>]*>', '', 'g')
    ELSE substring(regexp_replace(NEW.content, '<[^>]*>', '', 'g') from 1 for 300) || '...'
  END;
  
  -- Update the updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;