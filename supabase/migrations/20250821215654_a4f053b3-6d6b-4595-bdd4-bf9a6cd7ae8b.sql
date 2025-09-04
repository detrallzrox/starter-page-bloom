-- Add notification_sent column to bill_reminders table
ALTER TABLE public.bill_reminders 
ADD COLUMN notification_sent boolean NOT NULL DEFAULT false;