ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_user_id ON public.admin_action_logs(user_id);