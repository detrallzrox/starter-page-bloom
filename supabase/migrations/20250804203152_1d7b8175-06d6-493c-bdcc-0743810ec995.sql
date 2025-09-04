-- Criar função para processar pagamento de parcelas de forma atômica
-- Isso evita qualquer possibilidade de duplicação ou race conditions
CREATE OR REPLACE FUNCTION public.process_installment_payment(
  p_installment_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_category_id UUID DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL
) 
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;