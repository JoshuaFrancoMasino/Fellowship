-- Create storage bucket for pin images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pin-images', 'pin-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for pin images
CREATE POLICY "Anyone can view pin images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pin-images');

CREATE POLICY "Authenticated users can upload pin images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pin-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own pin images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pin-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own pin images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pin-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);