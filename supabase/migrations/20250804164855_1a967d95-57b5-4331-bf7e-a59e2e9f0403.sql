-- Adicionar campo receipt_url na tabela installments para salvar imagens das parcelas
ALTER TABLE public.installments 
ADD COLUMN receipt_url text;