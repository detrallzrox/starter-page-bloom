-- Create feature_usage_limits table to track free user usage of premium features
CREATE TABLE public.feature_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('photo', 'voice', 'export', 'installment_view')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, feature_type)
);

-- Enable RLS
ALTER TABLE public.feature_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feature usage" 
ON public.feature_usage_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature usage" 
ON public.feature_usage_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature usage" 
ON public.feature_usage_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Shared account users can view feature usage of the account owner
CREATE POLICY "Shared account users can view owner feature usage" 
ON public.feature_usage_limits 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = feature_usage_limits.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

-- Shared account users can insert feature usage for the account owner
CREATE POLICY "Shared account users can insert owner feature usage" 
ON public.feature_usage_limits 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = feature_usage_limits.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

-- Shared account users can update feature usage for the account owner
CREATE POLICY "Shared account users can update owner feature usage" 
ON public.feature_usage_limits 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = feature_usage_limits.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

-- Create trigger for updated_at
CREATE TRIGGER update_feature_usage_limits_updated_at
  BEFORE UPDATE ON public.feature_usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();