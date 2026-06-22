CREATE OR REPLACE FUNCTION public.check_user_rate_limit(
  p_user_id uuid,
  p_window_seconds int,
  p_max int
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT COUNT(*)::int AS used
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= now() - make_interval(secs => p_window_seconds)
  )
  SELECT jsonb_build_object(
    'used', c.used,
    'limit', p_max,
    'window_seconds', p_window_seconds,
    'allowed', c.used < p_max
  ) FROM c;
$$;

REVOKE EXECUTE ON FUNCTION public.check_user_rate_limit(uuid, int, int) FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_recent
  ON public.ai_usage_logs (user_id, created_at DESC);