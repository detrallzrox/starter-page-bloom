-- Consolidate multiple permissive policies into single policies
-- This fixes the "Multiple Permissive Policies" warnings while maintaining exact functionality

-- 1. BILL_REMINDERS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Shared account users can manage bill reminders" ON public.bill_reminders;

CREATE POLICY "Users and shared accounts can manage bill reminders" ON public.bill_reminders
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = bill_reminders.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = bill_reminders.user_id) AND (shared_accounts.status = 'accepted'::text)))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = bill_reminders.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 2. CATEGORIES TABLE - Keep separate SELECT and consolidate others
DROP POLICY IF EXISTS "Users can manage their own categories" ON public.categories;
DROP POLICY IF EXISTS "Shared account users can manage categories" ON public.categories;

CREATE POLICY "Users and shared accounts can manage categories" ON public.categories
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE (((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = categories.user_id) AND (shared_accounts.status = 'accepted'::text)))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 3. CATEGORY_BUDGETS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Shared account users can manage category budgets" ON public.category_budgets;

CREATE POLICY "Users and shared accounts can manage category budgets" ON public.category_budgets
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = category_budgets.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = category_budgets.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 4. FEATURE_USAGE_LIMITS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Shared account users can manage feature usage" ON public.feature_usage_limits;

CREATE POLICY "Users and shared accounts can manage feature usage" ON public.feature_usage_limits
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = feature_usage_limits.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = feature_usage_limits.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 5. INSTALLMENTS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can manage installments" ON public.installments;

CREATE POLICY "Users and shared accounts can manage installments" ON public.installments
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = installments.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 6. SUBSCRIPTIONS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Shared account users can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Users and shared accounts can manage subscriptions" ON public.subscriptions
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = subscriptions.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = subscriptions.user_id) AND (shared_accounts.status = 'accepted'::text)))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = subscriptions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);

-- 7. TRANSACTIONS TABLE - Consolidate into single policy
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Shared account users can manage transactions" ON public.transactions;

CREATE POLICY "Users and shared accounts can manage transactions" ON public.transactions
FOR ALL USING (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE (((shared_accounts.owner_id = transactions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = transactions.user_id) AND (shared_accounts.status = 'accepted'::text)))))
) WITH CHECK (
  ((select auth.uid()) = user_id) OR 
  (EXISTS ( SELECT 1
     FROM shared_accounts
    WHERE ((shared_accounts.owner_id = transactions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
);