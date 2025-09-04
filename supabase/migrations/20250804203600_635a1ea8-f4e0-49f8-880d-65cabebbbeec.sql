-- Teste para identificar o problema: vamos verificar o que acontece no F5
-- Criar uma view para monitorar todas as operações em tempo real

-- Primeiro, vamos verificar o estado atual das parcelas tedti
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE LOG '=== ESTADO ATUAL DAS PARCELAS TEDTI ===';
  
  FOR rec IN 
    SELECT 
      id, 
      current_installment, 
      installment_amount,
      is_paid,
      paid_at
    FROM installments 
    WHERE purchase_name = 'tedti' 
    ORDER BY current_installment
  LOOP
    RAISE LOG 'Parcela %/12: is_paid=%, amount=%, paid_at=%', 
      rec.current_installment, rec.is_paid, rec.installment_amount, rec.paid_at;
  END LOOP;
  
  -- Verificar o saldo atual
  SELECT current_balance, investment_balance INTO rec.installment_amount, rec.current_installment
  FROM profiles 
  WHERE user_id = '604cbe75-e1bf-4f00-879b-5099838a0c15';
  
  RAISE LOG '=== SALDO ATUAL: current_balance=%, investment_balance=% ===', 
    rec.installment_amount, rec.current_installment;
    
END $$;