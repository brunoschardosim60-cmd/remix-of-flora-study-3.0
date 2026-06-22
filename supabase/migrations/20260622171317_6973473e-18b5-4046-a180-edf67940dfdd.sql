CREATE TABLE public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members visible to authenticated" ON public.community_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users join themselves" ON public.community_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users leave themselves" ON public.community_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_community_members_user ON public.community_members(user_id);

-- Trigger: keep communities.member_count in sync
CREATE OR REPLACE FUNCTION public.bump_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_bump_member_count_ins
AFTER INSERT ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.bump_community_member_count();

CREATE TRIGGER trg_bump_member_count_del
AFTER DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.bump_community_member_count();