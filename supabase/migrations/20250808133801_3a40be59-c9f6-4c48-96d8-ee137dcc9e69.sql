-- Optimize database performance based on Query Performance analysis
-- Adding indexes for frequently queried columns to improve performance

-- 1. Add index for transactions by user_id and date (frequently queried together)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);

-- 2. Add index for transactions by category_id (for category-based queries)
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);

-- 3. Add index for bill_reminders by user_id and next_notification_date
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_notification ON public.bill_reminders(user_id, next_notification_date);

-- 4. Add index for installments by user_id and is_paid status
CREATE INDEX IF NOT EXISTS idx_installments_user_paid ON public.installments(user_id, is_paid);

-- 5. Add index for subscriptions by user_id and renewal_day
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_renewal ON public.subscriptions(user_id, renewal_day);

-- 6. Add index for notifications by user_id and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- 7. Add index for shared_accounts by status for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_accounts_status ON public.shared_accounts(status);

-- 8. Add composite index for feature_usage_limits
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_type ON public.feature_usage_limits(user_id, feature_type);

-- 9. Add index for profiles by user_id (should already exist but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 10. Add index for category_budgets by user_id and period dates
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_period ON public.category_budgets(user_id, period_start, period_end);