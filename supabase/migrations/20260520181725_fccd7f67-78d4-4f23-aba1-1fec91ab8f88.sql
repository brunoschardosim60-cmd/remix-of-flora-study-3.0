
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  level text NOT NULL DEFAULT 'medio',
  estimated_minutes int NOT NULL DEFAULT 15,
  cover_emoji text DEFAULT '📚',
  description text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_subject ON public.lessons(subject);
CREATE INDEX idx_lessons_published ON public.lessons(published);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published lessons" ON public.lessons FOR SELECT TO authenticated
  USING (published = true OR public.is_admin_user());
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  current_block int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  quiz_correct int NOT NULL DEFAULT 0,
  quiz_total int NOT NULL DEFAULT 0,
  seconds_studied int NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.is_admin_user());

CREATE TRIGGER trg_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
