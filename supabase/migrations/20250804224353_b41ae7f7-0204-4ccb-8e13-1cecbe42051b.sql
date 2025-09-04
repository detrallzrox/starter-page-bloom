-- Enable realtime for all transaction-related tables
ALTER TABLE public.bill_reminders REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;

-- Add all tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;