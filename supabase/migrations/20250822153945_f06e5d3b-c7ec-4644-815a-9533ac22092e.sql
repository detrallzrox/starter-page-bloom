-- Configure shared_accounts table for real-time updates
ALTER TABLE shared_accounts REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE shared_accounts;