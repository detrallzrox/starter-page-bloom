-- Teste prático: Inserir uma transação de teste e verificar o comportamento do trigger
-- Primeiro vamos verificar o saldo atual
DO $$
DECLARE
  current_bal NUMERIC;
  investment_bal NUMERIC;
  test_transaction_id UUID;
BEGIN
  -- Verificar saldo antes
  SELECT current_balance, investment_balance INTO current_bal, investment_bal
  FROM profiles WHERE user_id = '604cbe75-e1bf-4f00-879b-5099838a0c15';
  
  RAISE LOG 'TESTE INICIADO - Saldo atual ANTES: %, Investimento ANTES: %', current_bal, investment_bal;
  
  -- Inserir transação de teste
  test_transaction_id := gen_random_uuid();
  
  INSERT INTO transactions (
    id,
    user_id, 
    amount, 
    description, 
    category_id, 
    type, 
    date
  ) VALUES (
    test_transaction_id,
    '604cbe75-e1bf-4f00-879b-5099838a0c15', 
    50.00, 
    'TESTE TRIGGER - NÃO REMOVER', 
    '118d28e8-5998-48fd-bd7c-b56761c4212c', 
    'expense', 
    CURRENT_DATE
  );
  
  RAISE LOG 'TESTE - Transação inserida com ID: %', test_transaction_id;
  
  -- Verificar saldo depois
  SELECT current_balance, investment_balance INTO current_bal, investment_bal
  FROM profiles WHERE user_id = '604cbe75-e1bf-4f00-879b-5099838a0c15';
  
  RAISE LOG 'TESTE FINALIZADO - Saldo atual DEPOIS: %, Investimento DEPOIS: %', current_bal, investment_bal;
  
END $$;