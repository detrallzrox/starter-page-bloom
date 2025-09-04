-- Fix RLS policies for installments table
DROP POLICY IF EXISTS "Users can manage their own installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can view installments" ON public.installments;

-- Create proper RLS policies for installments
CREATE POLICY "Users can insert their own installments" 
ON public.installments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own installments" 
ON public.installments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own installments" 
ON public.installments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installments" 
ON public.installments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Shared account policies
CREATE POLICY "Shared account users can view installments" 
ON public.installments 
FOR SELECT 
USING ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE (((shared_accounts.owner_id = auth.uid()) AND (shared_accounts.shared_with_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)) 
  OR ((shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.owner_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)))
)));

CREATE POLICY "Shared account users can insert installments" 
ON public.installments 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE ((shared_accounts.owner_id = installments.user_id) AND (shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.status = 'accepted'::text))
)));

CREATE POLICY "Shared account users can update installments" 
ON public.installments 
FOR UPDATE 
USING ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE ((shared_accounts.owner_id = installments.user_id) AND (shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.status = 'accepted'::text))
)));