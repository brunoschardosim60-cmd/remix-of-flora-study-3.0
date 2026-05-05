-- Adiciona suporte a tipo (multipla_escolha / certo_errado), afirmativa, nivel e tags
ALTER TABLE public.concurso_questions
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'multipla_escolha',
  ADD COLUMN IF NOT EXISTS afirmativa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

-- Validação: tipo deve ser um dos valores conhecidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'concurso_questions_tipo_check'
  ) THEN
    ALTER TABLE public.concurso_questions
      ADD CONSTRAINT concurso_questions_tipo_check
      CHECK (tipo IN ('multipla_escolha','certo_errado'));
  END IF;
END$$;

-- Índices para acelerar filtros e busca aleatória
CREATE INDEX IF NOT EXISTS idx_concurso_questions_banca ON public.concurso_questions (banca);
CREATE INDEX IF NOT EXISTS idx_concurso_questions_disciplina ON public.concurso_questions (disciplina);
CREATE INDEX IF NOT EXISTS idx_concurso_questions_nivel ON public.concurso_questions (nivel);
CREATE INDEX IF NOT EXISTS idx_concurso_questions_tipo ON public.concurso_questions (tipo);
CREATE INDEX IF NOT EXISTS idx_concurso_questions_tags ON public.concurso_questions USING GIN (tags);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_concurso_questions_updated_at ON public.concurso_questions;
CREATE TRIGGER trg_concurso_questions_updated_at
  BEFORE UPDATE ON public.concurso_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();