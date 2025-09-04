-- Update RLS policy to allow shared account users to delete categories
DROP POLICY IF EXISTS "Users can delete their own categories and shared accounts" ON public.categories;

CREATE POLICY "Users can delete their own categories and shared accounts" 
ON public.categories 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 
    FROM shared_accounts 
    WHERE (
      (shared_accounts.owner_id = categories.user_id AND shared_accounts.shared_with_id = auth.uid() AND shared_accounts.status = 'accepted') 
      OR (shared_accounts.owner_id = auth.uid() AND shared_accounts.shared_with_id = categories.user_id AND shared_accounts.status = 'accepted')
    )
  )
);