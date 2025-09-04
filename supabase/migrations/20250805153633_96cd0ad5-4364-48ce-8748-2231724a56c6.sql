-- Corrigir políticas RLS para bill_reminders permitir operações em contas compartilhadas

-- Remover a política existente restritiva para gerenciamento
DROP POLICY "Users can manage their own bill reminders" ON public.bill_reminders;

-- Recriar políticas individuais para cada operação
CREATE POLICY "Users can insert their own bill reminders" 
ON public.bill_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill reminders" 
ON public.bill_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill reminders" 
ON public.bill_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Adicionar políticas para contas compartilhadas em todas as operações
CREATE POLICY "Shared account users can insert bill reminders" 
ON public.bill_reminders 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE ((shared_accounts.owner_id = user_id) AND (shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.status = 'accepted'::text))
)));

CREATE POLICY "Shared account users can update bill reminders" 
ON public.bill_reminders 
FOR UPDATE 
USING ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE ((shared_accounts.owner_id = user_id) AND (shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.status = 'accepted'::text))
)));

CREATE POLICY "Shared account users can delete bill reminders" 
ON public.bill_reminders 
FOR DELETE 
USING ((auth.uid() = user_id) OR (EXISTS ( 
  SELECT 1 FROM shared_accounts 
  WHERE ((shared_accounts.owner_id = user_id) AND (shared_accounts.shared_with_id = auth.uid()) AND (shared_accounts.status = 'accepted'::text))
)));