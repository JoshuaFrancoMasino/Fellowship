/*
  # Create marketplace feature

  1. New Tables
    - `marketplace_items`
      - `id` (uuid, primary key)
      - `seller_username` (text, seller's username)
      - `title` (text, item title, max 100 chars)
      - `description` (text, item description, max 1000 chars)
      - `price` (decimal, item price)
      - `images` (text array, image URLs)
      - `storage_paths` (text array, storage paths for uploaded images)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_active` (boolean, whether item is still for sale)

  2. Security
    - Enable RLS on `marketplace_items` table
    - Add policies for public read access
    - Add policies for authenticated users to create listings
    - Add policies for sellers to manage their own listings

  3. Storage
    - Create marketplace-images bucket
    - Set up storage policies for marketplace images
*/

-- Create marketplace_items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_username text NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 100),
  description text NOT NULL CHECK (char_length(description) <= 1000),
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  images text[] DEFAULT ARRAY[]::text[],
  storage_paths text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS marketplace_items_seller_username_idx ON marketplace_items (seller_username);
CREATE INDEX IF NOT EXISTS marketplace_items_created_at_idx ON marketplace_items (created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_items_is_active_idx ON marketplace_items (is_active);
CREATE INDEX IF NOT EXISTS marketplace_items_price_idx ON marketplace_items (price);

-- Enable RLS
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace items
CREATE POLICY "Anyone can read active marketplace items"
  ON marketplace_items
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can create marketplace items"
  ON marketplace_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = marketplace_items.seller_username
    )
  );

CREATE POLICY "Sellers can update their own marketplace items"
  ON marketplace_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = marketplace_items.seller_username
    )
  );

CREATE POLICY "Sellers can delete their own marketplace items"
  ON marketplace_items
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = marketplace_items.seller_username
    )
  );

-- Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for marketplace images
CREATE POLICY "Anyone can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-images');

CREATE POLICY "Authenticated users can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketplace-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own marketplace images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marketplace-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own marketplace images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketplace-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);