-- Tabela para persistir sessões de questões geradas por IA
-- Permite ao usuário recuperar a sessão ao reabrir o app (além do sessionStorage)
CREATE TABLE public.concurso_ia_sessions (
  id TEXT PRIMARY KEY,                          -- ex: "ia-1234567890-abc123"
  user_id UUID NOT NULL,
  banca TEXT NOT NULL DEFAULT '',
  materia TEXT NOT NULL DEFAULT '',
  assunto TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'medio',
  tipo TEXT NOT NULL DEFAULT 'multipla_escolha',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de Question completo
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { [question_id]: letra }
  current_index INTEGER NOT NULL DEFAULT 0,
  focus TEXT[] NOT NULL DEFAULT '{}',
  modo_foco_erros BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ia_sessions_user ON public.concurso_ia_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ia_sessions_expires ON public.concurso_ia_sessions(expires_at);

ALTER TABLE public.concurso_ia_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ia sessions"
ON public.concurso_ia_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
