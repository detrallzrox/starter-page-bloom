-- Add column to store the last selected account ID
ALTER TABLE public.profiles 
ADD COLUMN last_selected_account_id UUID;

-- Add comment to clarify the purpose
COMMENT ON COLUMN public.profiles.last_selected_account_id IS 'Stores the ID of the last account (personal or shared) that the user accessed';