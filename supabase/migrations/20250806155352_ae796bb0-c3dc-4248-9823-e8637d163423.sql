-- Add policy to allow shared account users to view subscription status of account owners
CREATE POLICY "Shared account users can view owner subscription status" 
ON public.subscribers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.shared_accounts 
    WHERE shared_accounts.owner_id = subscribers.user_id 
    AND shared_accounts.shared_with_id = auth.uid() 
    AND shared_accounts.status = 'accepted'
  )
);