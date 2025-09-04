-- Remove direct notification creation from budget trigger - let only NotificationCenter manage notifications
CREATE OR REPLACE FUNCTION public.check_budget_after_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  budget_record RECORD;
  total_spent NUMERIC;
  budget_amount NUMERIC;
  percentage_used NUMERIC;
BEGIN
  -- Só processar se for despesa
  IF NEW.type != 'expense' OR NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar orçamentos ativos para esta categoria e usuário
  FOR budget_record IN
    SELECT cb.*, c.name as category_name, c.icon as category_icon
    FROM category_budgets cb
    JOIN categories c ON c.id = cb.category_id
    WHERE cb.user_id = NEW.user_id 
    AND cb.category_id = NEW.category_id
    AND NEW.date >= cb.period_start 
    AND NEW.date <= cb.period_end
  LOOP
    -- Calcular total gasto na categoria durante o período (apenas transações criadas após a criação do orçamento)
    SELECT COALESCE(SUM(amount), 0) INTO total_spent
    FROM transactions
    WHERE user_id = NEW.user_id
    AND category_id = NEW.category_id
    AND type = 'expense'
    AND date >= budget_record.period_start
    AND date <= budget_record.period_end
    AND created_at >= budget_record.created_at;

    budget_amount := budget_record.budget_amount;
    percentage_used := (total_spent / budget_amount) * 100;

    -- Log para debug apenas
    RAISE LOG 'Budget check: category=%, spent=%/%, percentage=%', 
      budget_record.category_name, total_spent, budget_amount, percentage_used;

    -- Verificar se orçamento foi excedido (100% ou mais) 
    -- Mas não criar notificação - deixar para o NotificationCenter gerenciar via push
    IF percentage_used >= 100 THEN
      RAISE LOG 'Budget exceeded but notification will be managed by NotificationCenter: category=%, percentage=%', 
        budget_record.category_name, percentage_used;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;