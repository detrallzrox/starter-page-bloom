-- Inserir categorias padrão de investimentos se não existirem
INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
SELECT 'Renda Fixa', 'savings', '📊', '#3b82f6', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Renda Fixa' AND type = 'savings' AND is_default = true AND user_id IS NULL
);

INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
SELECT 'Reserva de Emergência', 'savings', '🛡️', '#10b981', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Reserva de Emergência' AND type = 'savings' AND is_default = true AND user_id IS NULL
);

-- Inserir outras categorias padrão úteis de investimentos
INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
SELECT 'Ações', 'savings', '📈', '#ef4444', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Ações' AND type = 'savings' AND is_default = true AND user_id IS NULL
);

INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
SELECT 'Fundos Imobiliários', 'savings', '🏢', '#f59e0b', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Fundos Imobiliários' AND type = 'savings' AND is_default = true AND user_id IS NULL
);

INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
SELECT 'Tesouro Direto', 'savings', '🏛️', '#6366f1', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories 
  WHERE name = 'Tesouro Direto' AND type = 'savings' AND is_default = true AND user_id IS NULL
);