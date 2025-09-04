-- Enable realtime for transactions and installments tables
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.installments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installments;