-- Create separate table for push notifications
CREATE TABLE public.push_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  push_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on push_notifications table
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for push_notifications
CREATE POLICY "Users can view their own push notifications" 
ON public.push_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert push notifications" 
ON public.push_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update push notifications" 
ON public.push_notifications 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_push_notifications_updated_at
BEFORE UPDATE ON public.push_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up notifications table to remove push_notification types
-- Keep only in-app notifications
UPDATE public.notifications 
SET type = CASE 
  WHEN type = 'push_notification' THEN 'info'
  ELSE type 
END
WHERE type = 'push_notification';

-- Add constraint to prevent push_notification type in notifications table
ALTER TABLE public.notifications 
ADD CONSTRAINT check_no_push_notification_type 
CHECK (type != 'push_notification');