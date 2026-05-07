
-- Tabela separada para tentativas em sessões de IA (não polui banco oficial)
CREATE TABLE public.concurso_ia_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  banca TEXT NOT NULL DEFAULT '',
  disciplina TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL DEFAULT '',
  assunto TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'medio',
  tipo TEXT NOT NULL DEFAULT 'multipla_escolha',
  enunciado TEXT NOT NULL DEFAULT '',
  enunciado_hash TEXT NOT NULL DEFAULT '',
  alternativa_marcada TEXT NOT NULL DEFAULT '',
  correta TEXT NOT NULL DEFAULT '',
  acertou BOOLEAN NOT NULL DEFAULT false,
  tempo_ms INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_concurso_ia_attempts_user ON public.concurso_ia_attempts(user_id, created_at DESC);
CREATE INDEX idx_concurso_ia_attempts_lookup ON public.concurso_ia_attempts(user_id, banca, disciplina, assunto);

ALTER TABLE public.concurso_ia_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ia attempts"
ON public.concurso_ia_attempts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all ia attempts"
ON public.concurso_ia_attempts
FOR SELECT
USING (is_admin_user());
