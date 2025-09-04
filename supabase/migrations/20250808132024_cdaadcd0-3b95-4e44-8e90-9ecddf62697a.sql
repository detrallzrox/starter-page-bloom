-- Fix RLS performance issues by optimizing auth function calls
-- Replace auth.uid() with (select auth.uid()) and auth.email() with (select auth.email())
-- to prevent re-evaluation for each row

-- 1. PROFILES TABLE
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile and shared accounts" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile and shared accounts" ON public.profiles;

CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own profile and shared accounts" ON public.profiles
FOR SELECT USING (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = profiles.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

CREATE POLICY "Users can update their own profile and shared accounts" ON public.profiles
FOR UPDATE USING (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = profiles.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

-- 2. SUBSCRIBERS TABLE
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Shared account users can view owner subscription status" ON public.subscribers;

CREATE POLICY "Users can view their own subscription" ON public.subscribers
FOR SELECT USING (((select auth.uid()) = user_id) OR (email = (select auth.email())));

CREATE POLICY "Shared account users can view owner subscription status" ON public.subscribers
FOR SELECT USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = subscribers.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))));

-- 3. NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING ((select auth.uid()) = user_id);

-- 4. DEVICE_REGISTRATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own device registrations" ON public.device_registrations;

CREATE POLICY "Users can view their own device registrations" ON public.device_registrations
FOR SELECT USING ((select auth.uid()) = user_id);

-- 5. SHARED_ACCOUNTS TABLE
DROP POLICY IF EXISTS "Users can view their shared accounts" ON public.shared_accounts;
DROP POLICY IF EXISTS "Users can create shared accounts" ON public.shared_accounts;
DROP POLICY IF EXISTS "Users can update their shared accounts" ON public.shared_accounts;
DROP POLICY IF EXISTS "Users can delete their shared accounts" ON public.shared_accounts;

CREATE POLICY "Users can view their shared accounts" ON public.shared_accounts
FOR SELECT USING (((select auth.uid()) = owner_id) OR ((select auth.uid()) = shared_with_id));

CREATE POLICY "Users can create shared accounts" ON public.shared_accounts
FOR INSERT WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Users can update their shared accounts" ON public.shared_accounts
FOR UPDATE USING (((select auth.uid()) = owner_id) OR ((select auth.uid()) = shared_with_id));

CREATE POLICY "Users can delete their shared accounts" ON public.shared_accounts
FOR DELETE USING (((select auth.uid()) = owner_id) OR ((select auth.uid()) = shared_with_id));

-- 6. BILL_REMINDERS TABLE
DROP POLICY IF EXISTS "Shared account users can view bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Users can insert their own bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Users can update their own bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Users can delete their own bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Shared account users can insert bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Shared account users can update bill reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Shared account users can delete bill reminders" ON public.bill_reminders;

CREATE POLICY "Users can manage their own bill reminders" ON public.bill_reminders
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage bill reminders" ON public.bill_reminders
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = bill_reminders.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = bill_reminders.user_id) AND (shared_accounts.status = 'accepted'::text)))))
WITH CHECK (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = bill_reminders.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

-- 7. SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Shared account users can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Shared account users can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Shared account users can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Shared account users can delete subscriptions" ON public.subscriptions;

CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage subscriptions" ON public.subscriptions
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = subscriptions.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = subscriptions.user_id) AND (shared_accounts.status = 'accepted'::text)))))
WITH CHECK (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = subscriptions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))));

-- 8. INSTALLMENTS TABLE
DROP POLICY IF EXISTS "Users can update their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can insert their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can view their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can delete their own installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can view installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can insert installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can update installments" ON public.installments;
DROP POLICY IF EXISTS "Shared account users can delete installments" ON public.installments;

CREATE POLICY "Users can manage their own installments" ON public.installments
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage installments" ON public.installments
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE (((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.owner_id = installments.user_id) AND (shared_accounts.status = 'accepted'::text)))))
WITH CHECK (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = installments.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

-- 9. TRANSACTIONS TABLE
DROP POLICY IF EXISTS "Users can view their own transactions and shared accounts" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions and shared accounts" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions and shared accounts" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions and shared accounts" ON public.transactions;

CREATE POLICY "Users can manage their own transactions" ON public.transactions
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage transactions" ON public.transactions
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE (((shared_accounts.owner_id = transactions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = transactions.user_id) AND (shared_accounts.status = 'accepted'::text)))))
WITH CHECK (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = transactions.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

-- 10. CATEGORIES TABLE
DROP POLICY IF EXISTS "Users can view their own categories, default ones and shared ac" ON public.categories;
DROP POLICY IF EXISTS "Users can create their own categories and shared accounts" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories and shared accounts" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories and shared accounts" ON public.categories;

CREATE POLICY "Users can view categories" ON public.categories
FOR SELECT USING (((select auth.uid()) = user_id) OR (is_default = true) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

CREATE POLICY "Users can manage their own categories" ON public.categories
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage categories" ON public.categories
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE (((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)) OR ((shared_accounts.owner_id = (select auth.uid())) AND (shared_accounts.shared_with_id = categories.user_id) AND (shared_accounts.status = 'accepted'::text)))))
WITH CHECK (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = categories.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text)))));

-- 11. FEATURE_USAGE_LIMITS TABLE
DROP POLICY IF EXISTS "Users can view their own feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Users can insert their own feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Users can update their own feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Shared account users can view owner feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Shared account users can insert owner feature usage" ON public.feature_usage_limits;
DROP POLICY IF EXISTS "Shared account users can update owner feature usage" ON public.feature_usage_limits;

CREATE POLICY "Users can manage their own feature usage" ON public.feature_usage_limits
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage feature usage" ON public.feature_usage_limits
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = feature_usage_limits.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
WITH CHECK (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = feature_usage_limits.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))));

-- 12. FEATURE_USAGE TABLE
DROP POLICY IF EXISTS "Users can view their own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can insert their own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can update their own feature usage" ON public.feature_usage;

CREATE POLICY "Users can manage their own feature usage" ON public.feature_usage
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- 13. CATEGORY_BUDGETS TABLE
DROP POLICY IF EXISTS "Users can view their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Users can insert their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Users can update their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Users can delete their own category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Shared account users can view owner category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Shared account users can insert owner category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Shared account users can update owner category budgets" ON public.category_budgets;
DROP POLICY IF EXISTS "Shared account users can delete owner category budgets" ON public.category_budgets;

CREATE POLICY "Users can manage their own category budgets" ON public.category_budgets
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Shared account users can manage category budgets" ON public.category_budgets
FOR ALL USING (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = category_budgets.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))))
WITH CHECK (EXISTS ( SELECT 1
   FROM shared_accounts
  WHERE ((shared_accounts.owner_id = category_budgets.user_id) AND (shared_accounts.shared_with_id = (select auth.uid())) AND (shared_accounts.status = 'accepted'::text))));

-- 14. USER_SETTINGS TABLE
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

CREATE POLICY "Users can manage their own settings" ON public.user_settings
FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);