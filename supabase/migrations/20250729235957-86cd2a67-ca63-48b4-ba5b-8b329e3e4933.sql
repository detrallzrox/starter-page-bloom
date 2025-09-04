-- Adicionar colunas para controle de saldo na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance_set_at TIMESTAMP WITH TIME ZONE;