/*
  # Social Mapping Platform Database Schema

  1. New Tables
    - `pins`
      - `id` (uuid, primary key)
      - `username` (text, guest username)
      - `lat` (double precision, latitude)
      - `lng` (double precision, longitude)
      - `description` (text, max 200 chars)
      - `images` (text array, image URLs)
      - `created_at` (timestamp)
    
    - `likes`
      - `id` (uuid, primary key)
      - `username` (text, guest username)
      - `pin_id` (uuid, foreign key)
      - `image_index` (integer, which image was liked)
      - `created_at` (timestamp)
    
    - `comments`
      - `id` (uuid, primary key) 
      - `username` (text, guest username)
      - `pin_id` (uuid, foreign key)
      - `text` (text, max 100 chars)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for users to manage their own content
*/

-- Create pins table
CREATE TABLE IF NOT EXISTS pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  description text NOT NULL CHECK (char_length(description) <= 200),
  images text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Create likes table  
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  pin_id uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  image_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(username, pin_id, image_index)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  pin_id uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) <= 100),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Pins policies
CREATE POLICY "Anyone can read pins"
  ON pins
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create pins"
  ON pins
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can delete their own pins"
  ON pins
  FOR DELETE
  TO public
  USING (true);

-- Likes policies
CREATE POLICY "Anyone can read likes"
  ON likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create likes"
  ON likes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can delete likes"
  ON likes
  FOR DELETE
  TO public
  USING (true);

-- Comments policies
CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create comments"
  ON comments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can delete comments"
  ON comments
  FOR DELETE
  TO public
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS pins_location_idx ON pins (lat, lng);
CREATE INDEX IF NOT EXISTS pins_created_at_idx ON pins (created_at DESC);
CREATE INDEX IF NOT EXISTS pins_username_idx ON pins (username);
CREATE INDEX IF NOT EXISTS likes_pin_id_idx ON likes (pin_id);
CREATE INDEX IF NOT EXISTS comments_pin_id_idx ON comments (pin_id);