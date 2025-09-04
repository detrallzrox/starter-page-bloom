-- Testar se tudo está funcionando e criar dados de exemplo

-- 1. Verificar se o cron job foi criado
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'process-daily-notifications';

-- 2. Verificar se as tabelas estão OK
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM public.profiles;  
SELECT COUNT(*) as total_subscribers FROM public.subscribers;

-- 3. Criar categorias padrão se não existirem
INSERT INTO public.categories (name, type, color, icon, is_default) VALUES
('Alimentação', 'expense', '#ef4444', '🍽️', true),
('Transporte', 'expense', '#f97316', '🚗', true),
('Moradia', 'expense', '#06b6d4', '🏠', true),
('Saúde', 'expense', '#10b981', '🏥', true),
('Educação', 'expense', '#8b5cf6', '📚', true),
('Lazer', 'expense', '#ec4899', '🎉', true),
('Salário', 'income', '#22c55e', '💼', true),
('Freelance', 'income', '#84cc16', '💻', true),
('Investimentos', 'income', '#06b6d4', '📈', true),
('Outros', 'expense', '#6b7280', '📦', true)
ON CONFLICT (name, type, is_default) DO NOTHING;