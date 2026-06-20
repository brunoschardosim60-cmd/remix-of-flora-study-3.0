ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS tema_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS tema_reason text,
  ADD COLUMN IF NOT EXISTS tema_classified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS tema_classifier_version text;

CREATE INDEX IF NOT EXISTS idx_questions_disciplina_tema ON public.questions (disciplina, tema);
CREATE INDEX IF NOT EXISTS idx_questions_tema_confidence ON public.questions (tema_confidence);
CREATE INDEX IF NOT EXISTS idx_questions_tema_classified_at ON public.questions (tema_classified_at);

COMMENT ON COLUMN public.questions.tema_confidence IS 'Confiança da classificação automática de tema, de 0 a 1.';
COMMENT ON COLUMN public.questions.tema_reason IS 'Motivo curto usado pelo classificador para escolher o tema.';
COMMENT ON COLUMN public.questions.tema_classified_at IS 'Data/hora da última classificação automática de tema.';
COMMENT ON COLUMN public.questions.tema_classifier_version IS 'Versão/prompt do classificador usado na última classificação.';