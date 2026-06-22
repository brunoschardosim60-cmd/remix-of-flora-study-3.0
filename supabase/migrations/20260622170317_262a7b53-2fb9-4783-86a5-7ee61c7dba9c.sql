-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow','mention')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "system can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

-- post_reports
CREATE TABLE public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

GRANT SELECT, INSERT ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own reports" ON public.post_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "users see own reports" ON public.post_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "moderators see all reports" ON public.post_reports
  FOR SELECT TO authenticated USING (public.is_moderator());
CREATE POLICY "moderators update reports" ON public.post_reports
  FOR UPDATE TO authenticated USING (public.is_moderator());

-- trigger: notificar autor do post quando curtido
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (v_author, NEW.user_id, 'like', NEW.post_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- trigger: notificar autor do post quando comentado
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (v_author, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;