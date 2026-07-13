
DO $$ BEGIN
  CREATE TYPE public.student_goal_status AS ENUM ('active','paused','done','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.student_goals_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status public.student_goal_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_goals_v2 TO authenticated;
GRANT ALL ON public.student_goals_v2 TO service_role;
ALTER TABLE public.student_goals_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals v2" ON public.student_goals_v2 FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX student_goals_v2_user_status_idx ON public.student_goals_v2 (user_id, status, priority DESC);
CREATE TRIGGER student_goals_v2_touch BEFORE UPDATE ON public.student_goals_v2
  FOR EACH ROW EXECUTE FUNCTION public.flora_touch_updated_at();
