-- Adicionar campo para controlar se o orçamento deve ser renovado automaticamente
ALTER TABLE category_budgets 
ADD COLUMN auto_renew boolean NOT NULL DEFAULT false;