
-- Helpers granulares: agrega is_admin (legado) + user_roles novo.
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_user() OR public.has_role(auth.uid(), 'moderator')
$$;

CREATE OR REPLACE FUNCTION public.is_support()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_user()
     OR public.has_role(auth.uid(), 'moderator')
     OR public.has_role(auth.uid(), 'support')
$$;

-- Moderation: pode LER posts/comments/essays (essay já é moderação de conteúdo) e logs.
DROP POLICY IF EXISTS "moderators read posts"           ON public.posts;
DROP POLICY IF EXISTS "moderators read comments"        ON public.comments;
DROP POLICY IF EXISTS "moderators read essays"          ON public.essays;
DROP POLICY IF EXISTS "moderators read admin logs"      ON public.admin_action_logs;

CREATE POLICY "moderators read posts"
  ON public.posts FOR SELECT TO authenticated
  USING (public.is_moderator());

CREATE POLICY "moderators read comments"
  ON public.comments FOR SELECT TO authenticated
  USING (public.is_moderator());

CREATE POLICY "moderators read essays"
  ON public.essays FOR SELECT TO authenticated
  USING (public.is_moderator());

CREATE POLICY "moderators read admin logs"
  ON public.admin_action_logs FOR SELECT TO authenticated
  USING (public.is_moderator());

-- Support: pode LER perfis, tiers e logs de uso de IA pra ajudar usuários.
DROP POLICY IF EXISTS "support reads profiles"       ON public.profiles;
DROP POLICY IF EXISTS "support reads user_tiers"     ON public.user_tiers;
DROP POLICY IF EXISTS "support reads ai_usage_logs"  ON public.ai_usage_logs;

CREATE POLICY "support reads profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_support());

CREATE POLICY "support reads user_tiers"
  ON public.user_tiers FOR SELECT TO authenticated
  USING (public.is_support());

CREATE POLICY "support reads ai_usage_logs"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (public.is_support());
