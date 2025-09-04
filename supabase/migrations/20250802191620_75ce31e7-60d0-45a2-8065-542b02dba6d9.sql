-- Enable realtime for installments table
-- First set replica identity to capture full row data during updates
ALTER TABLE public.installments REPLICA IDENTITY FULL;

-- Add the table to supabase_realtime publication to enable realtime functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.installments;