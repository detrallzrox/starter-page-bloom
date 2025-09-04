-- CORREÇÃO CRÍTICA DE SEGURANÇA: Políticas RLS da tabela subscribers

-- 1. Remover políticas perigosas existentes
DROP POLICY IF EXISTS "Users can insert subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- 2. Criar política segura para INSERT
-- Só permite inserir se o user_id corresponde ao usuário autenticado OU se é uma operação do sistema
CREATE POLICY "Users can only insert their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.email() = email AND user_id IS NULL) OR
  (auth.role() = 'service_role')
);

-- 3. Criar política segura para UPDATE  
-- Só permite atualizar se o user_id corresponde ao usuário autenticado OU se é uma operação do sistema
CREATE POLICY "Users can only update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (auth.email() = email) OR
  (auth.role() = 'service_role')
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.email() = email) OR
  (auth.role() = 'service_role')
);

-- 4. Adicionar política para DELETE (por segurança)
CREATE POLICY "Only system can delete subscriptions" 
ON public.subscribers 
FOR DELETE 
USING (auth.role() = 'service_role');