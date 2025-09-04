-- Fix remaining multiple permissive policies and duplicate constraints
-- Maintaining exact same functionality

-- 1. CATEGORIES TABLE - Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Users and shared accounts can manage categories" ON public.categories;

-- Create single comprehensive policy for categories
CREATE POLICY "Users and shared accounts can access categories" ON public.categories
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (is_default = true) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 2. SUBSCRIBERS TABLE - Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Shared account users can view owner subscription status" ON public.subscribers;

-- Create single comprehensive policy for subscribers
CREATE POLICY "Users and shared accounts can view subscriptions" ON public.subscribers
FOR SELECT USING (
  ((select auth.uid()) = user_id) OR 
  (email = (select auth.email())) OR
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = subscribers.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 3. Remove duplicate constraint from category_budgets table
-- Keep the more descriptive constraint and drop the generic one
ALTER TABLE public.category_budgets 
DROP CONSTRAINT IF EXISTS category_budgets_user_id_category_id_period_start_period_en_key;