-- Histórico consolidado de simulados de concurso
CREATE TABLE IF NOT EXISTS public.concurso_simulado_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  banca TEXT NOT NULL DEFAULT '',
  disciplina TEXT NOT NULL DEFAULT '',
  total_questoes INTEGER NOT NULL DEFAULT 0,
  acertos INTEGER NOT NULL DEFAULT 0,
  duracao_ms INTEGER NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'banco',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concurso_simulado_user_date ON public.concurso_simulado_results(user_id, created_at DESC);

ALTER TABLE public.concurso_simulado_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own simulado results"
ON public.concurso_simulado_results
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all simulado results"
ON public.concurso_simulado_results
FOR SELECT
USING (is_admin_user());