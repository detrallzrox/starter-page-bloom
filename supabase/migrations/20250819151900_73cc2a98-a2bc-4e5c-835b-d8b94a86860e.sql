-- Criar trigger para verificar orçamentos após inserção de transação
CREATE TRIGGER budget_check_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_budget_after_transaction();