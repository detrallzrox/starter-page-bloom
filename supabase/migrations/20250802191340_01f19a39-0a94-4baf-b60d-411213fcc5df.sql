-- Fix RLS policy for installments DELETE in shared accounts
-- The current policy only allows deletion when the owner shared with the current user
-- But we need to allow deletion when the current user is accessing a shared account

DROP POLICY IF EXISTS "Shared account users can delete installments" ON public.installments;

-- Create a more comprehensive policy that allows deletion in both directions of sharing
CREATE POLICY "Shared account users can delete installments" ON public.installments
FOR DELETE USING (
  (auth.uid() = user_id) OR (
    EXISTS (
      SELECT 1 FROM shared_accounts
      WHERE (
        -- Case 1: Current user is the owner, installments belong to shared user
        (shared_accounts.owner_id = auth.uid() AND shared_accounts.shared_with_id = installments.user_id AND shared_accounts.status = 'accepted') OR
        -- Case 2: Current user is shared with the owner of the installments  
        (shared_accounts.owner_id = installments.user_id AND shared_accounts.shared_with_id = auth.uid() AND shared_accounts.status = 'accepted')
      )
    )
  )
);