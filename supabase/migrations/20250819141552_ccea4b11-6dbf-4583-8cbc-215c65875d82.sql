-- Verificar e atualizar RLS policies para garantir acesso correto às contas compartilhadas

-- Para a tabela notifications, permitir acesso às notificações da conta compartilhada
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users and shared accounts can view notifications"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM shared_accounts
    WHERE (
      (shared_accounts.owner_id = notifications.user_id AND shared_accounts.shared_with_id = auth.uid() AND shared_accounts.status = 'accepted') OR
      (shared_accounts.shared_with_id = notifications.user_id AND shared_accounts.owner_id = auth.uid() AND shared_accounts.status = 'accepted')
    )
  )
);

-- Para a tabela profiles, garantir que o balance seja acessível para contas compartilhadas
-- (Esta policy já existe e está correta)

-- Verificar triggers para update_investment_balance
-- Garantir que o trigger funcione corretamente para contas compartilhadas

-- Criar trigger para atualizar investment_balance após INSERT de transações
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON public.transactions;
CREATE TRIGGER update_investment_balance_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_balance();

-- Criar trigger para reverter investment_balance após DELETE de transações  
DROP TRIGGER IF EXISTS reverse_investment_balance_trigger ON public.transactions;
CREATE TRIGGER reverse_investment_balance_trigger
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_investment_balance();