-- Enable realtime for all main tables
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.installments REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.bill_reminders REPLICA IDENTITY FULL;
ALTER TABLE public.category_budgets REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;

-- Add all tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;