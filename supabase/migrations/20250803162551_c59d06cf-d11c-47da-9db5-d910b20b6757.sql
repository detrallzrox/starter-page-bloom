-- Remover o constraint antigo que não inclui 'savings'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Adicionar novo constraint que inclui 'savings'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY['expense'::text, 'income'::text, 'savings'::text]));