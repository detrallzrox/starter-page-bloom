-- Corrigir as últimas funções com problemas de segurança
CREATE OR REPLACE FUNCTION public.process_installment_payment(p_installment_id uuid, p_user_id uuid, p_amount numeric, p_description text, p_category_id uuid DEFAULT NULL::uuid, p_receipt_url text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_result JSON;
  v_transaction_id UUID;
  v_installment_exists BOOLEAN := FALSE;
  v_already_paid BOOLEAN := FALSE;
BEGIN
  -- Log início da operação
  RAISE LOG 'ATOMIC_PAYMENT_START: installment_id=%, user_id=%, amount=%', p_installment_id, p_user_id, p_amount;
  
  -- Verificar se a parcela existe e não está paga
  SELECT 
    (COUNT(*) > 0) AS exists,
    (COUNT(*) FILTER (WHERE is_paid = true) > 0) AS already_paid
  INTO v_installment_exists, v_already_paid
  FROM installments 
  WHERE id = p_installment_id AND user_id = p_user_id;
  
  IF NOT v_installment_exists THEN
    RAISE EXCEPTION 'Parcela não encontrada para o usuário informado';
  END IF;
  
  IF v_already_paid THEN
    RAISE EXCEPTION 'Parcela já foi paga anteriormente';
  END IF;
  
  -- Gerar ID para a transação
  v_transaction_id := gen_random_uuid();
  
  -- 1. Marcar parcela como paga
  UPDATE installments 
  SET 
    is_paid = true, 
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_installment_id AND user_id = p_user_id;
  
  RAISE LOG 'ATOMIC_PAYMENT: Installment marked as paid - ID=%', p_installment_id;
  
  -- 2. Criar transação de despesa
  INSERT INTO transactions (
    id,
    user_id,
    amount,
    description,
    category_id,
    type,
    receipt_url,
    date,
    created_at,
    updated_at
  ) VALUES (
    v_transaction_id,
    p_user_id,
    p_amount,
    p_description,
    p_category_id,
    'expense',
    p_receipt_url,
    CURRENT_DATE,
    NOW(),
    NOW()
  );
  
  RAISE LOG 'ATOMIC_PAYMENT: Transaction created - ID=%, Amount=%', v_transaction_id, p_amount;
  
  -- 3. Criar notificação
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    created_at
  ) VALUES (
    p_user_id,
    'Parcela paga',
    'Parcela de ' || p_description || ' - R$ ' || p_amount || ' foi paga e registrada como despesa',
    'transaction',
    NOW()
  );
  
  RAISE LOG 'ATOMIC_PAYMENT: Notification created for user=%', p_user_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'installment_id', p_installment_id,
    'amount', p_amount,
    'message', 'Pagamento processado com sucesso'
  );
  
  RAISE LOG 'ATOMIC_PAYMENT_SUCCESS: %', v_result;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'ATOMIC_PAYMENT_ERROR: % - %', SQLSTATE, SQLERRM;
  -- Re-lançar a exceção para que seja tratada pelo cliente
  RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_by_email(email_to_search text)
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as id,
    email_to_search as email
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = p.user_id 
    AND u.email = email_to_search
  )
  LIMIT 1;
END;
$function$;