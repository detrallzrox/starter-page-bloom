-- Atualizar função para criar notificações para contas compartilhadas
CREATE OR REPLACE FUNCTION public.check_budget_after_transaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_record RECORD;
  total_spent NUMERIC;
  budget_amount NUMERIC;
  percentage_used NUMERIC;
  existing_notification_count INTEGER;
  shared_user_id UUID;
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

    -- Log para debug
    RAISE LOG 'Budget check: category=%, spent=%/%, percentage=%', 
      budget_record.category_name, total_spent, budget_amount, percentage_used;

    -- Verificar se orçamento foi excedido (100% ou mais)
    IF percentage_used >= 100 THEN
      -- Verificar se já existe notificação para este orçamento no período para o usuário proprietário
      SELECT COUNT(*) INTO existing_notification_count
      FROM notifications
      WHERE user_id = NEW.user_id
      AND type = 'budget_exceeded'
      AND reference_id = budget_record.id
      AND created_at >= budget_record.period_start::timestamp
      AND created_at <= (budget_record.period_end::date + INTERVAL '1 day')::timestamp;

      IF existing_notification_count = 0 THEN
        -- Criar notificação para o proprietário da conta
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          reference_id,
          reference_type,
          navigation_data
        ) VALUES (
          NEW.user_id,
          'Orçamento Excedido',
          'Seu orçamento para ' || budget_record.category_name || ' foi excedido! Gasto: R$ ' || 
          ROUND(total_spent, 2) || ' / Orçamento: R$ ' || ROUND(budget_amount, 2),
          'budget_exceeded',
          budget_record.id,
          'category_budget',
          json_build_object(
            'category_id', budget_record.category_id,
            'category_name', budget_record.category_name,
            'total_spent', total_spent,
            'budget_amount', budget_amount,
            'percentage_used', percentage_used
          )
        );

        -- Verificar se existe conta compartilhada e criar notificação para o usuário compartilhado também
        FOR shared_user_id IN
          SELECT sa.shared_with_id
          FROM shared_accounts sa
          WHERE sa.owner_id = NEW.user_id 
          AND sa.status = 'accepted'
          AND sa.shared_with_id IS NOT NULL
        LOOP
          -- Verificar se já existe notificação para o usuário compartilhado
          SELECT COUNT(*) INTO existing_notification_count
          FROM notifications
          WHERE user_id = shared_user_id
          AND type = 'budget_exceeded'
          AND reference_id = budget_record.id
          AND created_at >= budget_record.period_start::timestamp
          AND created_at <= (budget_record.period_end::date + INTERVAL '1 day')::timestamp;

          IF existing_notification_count = 0 THEN
            -- Criar notificação para o usuário compartilhado
            INSERT INTO notifications (
              user_id,
              title,
              message,
              type,
              reference_id,
              reference_type,
              navigation_data
            ) VALUES (
              shared_user_id,
              'Orçamento Excedido',
              'O orçamento para ' || budget_record.category_name || ' foi excedido! Gasto: R$ ' || 
              ROUND(total_spent, 2) || ' / Orçamento: R$ ' || ROUND(budget_amount, 2),
              'budget_exceeded',
              budget_record.id,
              'category_budget',
              json_build_object(
                'category_id', budget_record.category_id,
                'category_name', budget_record.category_name,
                'total_spent', total_spent,
                'budget_amount', budget_amount,
                'percentage_used', percentage_used
              )
            );

            RAISE LOG 'Budget notification created for shared user: % (category: %)', 
              shared_user_id, budget_record.category_name;
          END IF;
        END LOOP;

        RAISE LOG 'Budget notification created for category: % (spent: %/%)', 
          budget_record.category_name, total_spent, budget_amount;
      ELSE
        RAISE LOG 'Budget notification already exists for category: %', budget_record.category_name;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;