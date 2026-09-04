CREATE TABLE IF NOT EXISTS public.medicine_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'Ciclo básico'
    CHECK (level IN ('Iniciante', 'Ciclo básico', 'Ciclo clínico', 'Internato', 'Residência')),
  study_hours integer NOT NULL DEFAULT 8 CHECK (study_hours BETWEEN 2 AND 40),
  study_goal text NOT NULL DEFAULT 'Dominar anatomia e fisiologia' CHECK (char_length(study_goal) <= 240),
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  answered jsonb NOT NULL DEFAULT '{}'::jsonb,
  wrong_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  case_step integer NOT NULL DEFAULT 0 CHECK (case_step BETWEEN 0 AND 5),
  content_version text NOT NULL DEFAULT 'MED-2026.08.24',
  learning_state jsonb NOT NULL DEFAULT '{"version":1,"items":{}}'::jsonb,
  case_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_section text NOT NULL DEFAULT 'home',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.medicine_progress TO authenticated;
GRANT ALL ON public.medicine_progress TO service_role;
ALTER TABLE public.medicine_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their medicine progress" ON public.medicine_progress;
CREATE POLICY "Users can read their medicine progress" ON public.medicine_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their medicine progress" ON public.medicine_progress;
CREATE POLICY "Users can create their medicine progress" ON public.medicine_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their medicine progress" ON public.medicine_progress;
CREATE POLICY "Users can update their medicine progress" ON public.medicine_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_medicine_progress_ts ON public.medicine_progress;
CREATE TRIGGER update_medicine_progress_ts BEFORE UPDATE ON public.medicine_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.medicine_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_version text NOT NULL DEFAULT 'MED-2026.08.24',
  description text NOT NULL CHECK (char_length(description) BETWEEN 12 AND 2000),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','revisado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS medicine_content_reports_user_created_idx ON public.medicine_content_reports (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.medicine_content_reports TO authenticated;
GRANT ALL ON public.medicine_content_reports TO service_role;
ALTER TABLE public.medicine_content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create medicine content reports" ON public.medicine_content_reports;
CREATE POLICY "Users can create medicine content reports" ON public.medicine_content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can read their medicine content reports" ON public.medicine_content_reports;
CREATE POLICY "Users can read their medicine content reports" ON public.medicine_content_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);