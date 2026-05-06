-- Revoga EXECUTE de todas as funções SECURITY DEFINER do schema public
-- e reconcede apenas onde necessário (funções chamadas via RPC/RLS).

-- 1) Funções de trigger / internas: nunca devem ser chamáveis externamente.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_tier() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_pending_user_data() FROM PUBLIC, anon, authenticated;

-- 2) Funções usadas por RLS policies / RPC autenticada: revoga de anon, mantém authenticated.
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.question_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.question_stats() TO authenticated;
