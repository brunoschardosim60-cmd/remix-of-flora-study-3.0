-- 1) Funções de trigger: nunca devem ser executadas diretamente
REVOKE EXECUTE ON FUNCTION public.bump_community_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_dm_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_group_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;

-- 2) Helpers de autorização: anon não precisa, authenticated usa via RLS
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_support() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support() TO authenticated;

-- 3) Tightening policy permissiva em notifications
DROP POLICY IF EXISTS "system can insert notifications" ON public.notifications;
CREATE POLICY "service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);