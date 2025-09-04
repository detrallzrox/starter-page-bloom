-- Add DELETE policy for shared_accounts table
CREATE POLICY "Users can delete their shared accounts"
ON public.shared_accounts
FOR DELETE
USING ((auth.uid() = owner_id) OR (auth.uid() = shared_with_id));