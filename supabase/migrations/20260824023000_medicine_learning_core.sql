-- Medicine learning core: educational progress and editorial reports only.
-- Never store identifiable patient data in these tables.

CREATE TABLE public.medicine_progress (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their medicine progress"
  ON public.medicine_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their medicine progress"
  ON public.medicine_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their medicine progress"
  ON public.medicine_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_medicine_progress_ts
  BEFORE UPDATE ON public.medicine_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.medicine_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_version text NOT NULL DEFAULT 'MED-2026.08.24',
  description text NOT NULL CHECK (char_length(description) BETWEEN 12 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX medicine_content_reports_user_created_idx
  ON public.medicine_content_reports (user_id, created_at DESC);

ALTER TABLE public.medicine_content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create medicine content reports"
  ON public.medicine_content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their medicine content reports"
  ON public.medicine_content_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.medicine_progress FROM anon;
REVOKE ALL ON public.medicine_content_reports FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.medicine_progress TO authenticated;
GRANT SELECT, INSERT ON public.medicine_content_reports TO authenticated;

COMMENT ON TABLE public.medicine_progress IS 'Educational medicine-module progress. Contains no clinical or patient data.';
COMMENT ON TABLE public.medicine_content_reports IS 'User reports about educational content. Identifiable patient data is prohibited.';
