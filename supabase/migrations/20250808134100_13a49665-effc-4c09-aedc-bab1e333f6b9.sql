-- Fix Performance Advisor issues: remove unused indexes and add missing foreign key indexes
-- This will improve database performance without affecting functionality

-- 1. Remove unused indexes that are never accessed
DROP INDEX IF EXISTS public.idx_shared_accounts_status;
DROP INDEX IF EXISTS public.idx_feature_usage_user_type;
DROP INDEX IF EXISTS public.idx_profiles_user_id;
DROP INDEX IF EXISTS public.idx_category_budgets_user_period;
DROP INDEX IF EXISTS public.idx_notifications_user_read;
DROP INDEX IF EXISTS public.idx_subscriptions_user_renewal;
DROP INDEX IF EXISTS public.idx_installments_user_paid;
DROP INDEX IF EXISTS public.idx_bill_reminders_user_notification;
DROP INDEX IF EXISTS public.idx_transactions_category_id;
DROP INDEX IF EXISTS public.idx_transactions_user_date;

-- 2. Add indexes for unindexed foreign keys to improve query performance
-- These are actual foreign key relationships that need indexes

-- Categories table - if there are foreign key relationships
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id) WHERE user_id IS NOT NULL;

-- Device registrations - if there are foreign key relationships  
CREATE INDEX IF NOT EXISTS idx_device_registrations_user_id ON public.device_registrations(user_id) WHERE user_id IS NOT NULL;

-- Shared accounts foreign key indexes
CREATE INDEX IF NOT EXISTS idx_shared_accounts_owner_id ON public.shared_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_accounts_shared_with_id ON public.shared_accounts(shared_with_id) WHERE shared_with_id IS NOT NULL;

-- 3. Keep only essential indexes that are actually used by the application
-- Transactions by user_id (essential for user data access)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Profiles by user_id (essential - this should be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON public.profiles(user_id);

-- Bill reminders by user_id (essential for user reminders)
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON public.bill_reminders(user_id);

-- Installments by user_id (essential for user installments)
CREATE INDEX IF NOT EXISTS idx_installments_user_id ON public.installments(user_id);

-- Subscriptions by user_id (essential for user subscriptions)  
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Notifications by user_id (essential for user notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Feature usage limits by user_id (essential for limits checking)
CREATE INDEX IF NOT EXISTS idx_feature_usage_limits_user_id ON public.feature_usage_limits(user_id);

-- Category budgets by user_id (essential for user budgets)
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id ON public.category_budgets(user_id);