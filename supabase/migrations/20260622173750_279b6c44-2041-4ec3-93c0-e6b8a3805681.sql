-- DMs (mensagens diretas) + Grupos privados de estudo

-- 1) Conversas 1:1
CREATE TABLE public.dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dm_threads_users_order CHECK (user_a < user_b),
  CONSTRAINT dm_threads_unique UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see their threads" ON public.dm_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "users create threads they're in" ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "users update their threads" ON public.dm_threads FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thread participants read" ON public.dm_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid())));
CREATE POLICY "thread participants send" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid())));
CREATE INDEX idx_dm_messages_thread_created ON public.dm_messages(thread_id, created_at DESC);

-- Bump last_message_at
CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_bump_dm_thread AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- 2) Grupos privados de estudo
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.study_group_members (
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group UUID, _user UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group AND user_id = _user)
$$;

CREATE POLICY "members or creator see group" ON public.study_groups FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_group_member(id, auth.uid()));
CREATE POLICY "anyone authenticated creates group" ON public.study_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator updates group" ON public.study_groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "creator deletes group" ON public.study_groups FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "see members of own groups" ON public.study_group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "join as self" ON public.study_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave as self" ON public.study_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_group_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_group_members_count
  AFTER INSERT OR DELETE ON public.study_group_members
  FOR EACH ROW EXECUTE FUNCTION public.bump_group_member_count();

-- Mensagens de grupo
CREATE TABLE public.study_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_group_messages TO service_role;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read group msgs" ON public.study_group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "members send group msgs" ON public.study_group_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "author deletes own msg" ON public.study_group_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX idx_group_msgs_group_created ON public.study_group_messages(group_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;