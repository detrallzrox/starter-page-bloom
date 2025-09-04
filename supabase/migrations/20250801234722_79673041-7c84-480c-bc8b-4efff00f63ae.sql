-- Update storage policies to allow proper receipt uploads and access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

-- Create new policies with proper permissions
-- Allow authenticated users to upload receipts
CREATE POLICY "Users can upload receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid() IS NOT NULL
);

-- Allow users to view their own receipts and receipts from shared accounts
CREATE POLICY "Users can view receipts" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'receipts' 
  AND (
    -- User can see their own receipts
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User can see receipts from shared accounts they have access to
    EXISTS (
      SELECT 1 
      FROM shared_accounts sa
      WHERE (
        (sa.owner_id = auth.uid() AND sa.shared_with_id::text = (storage.foldername(name))[1] AND sa.status = 'accepted')
        OR
        (sa.shared_with_id = auth.uid() AND sa.owner_id::text = (storage.foldername(name))[1] AND sa.status = 'accepted')
      )
    )
  )
);

-- Allow users to update their own receipts
CREATE POLICY "Users can update receipts" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete receipts" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);