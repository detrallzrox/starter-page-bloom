-- Ensure RLS is enabled on fcm_tokens table
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Users can manage their own FCM tokens" ON public.fcm_tokens;

-- Create policy for FCM tokens
CREATE POLICY "Users can manage their own FCM tokens" 
ON public.fcm_tokens 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);