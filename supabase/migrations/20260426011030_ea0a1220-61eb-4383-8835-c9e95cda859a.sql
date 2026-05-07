-- Evitar questões duplicadas (ano + prova + numero + area)
CREATE UNIQUE INDEX IF NOT EXISTS uq_questions_ano_prova_numero_area
ON public.questions (ano, prova, numero, area)
WHERE ano IS NOT NULL AND numero IS NOT NULL;

-- Evitar temas duplicados (ano + prova)
CREATE UNIQUE INDEX IF NOT EXISTS uq_essay_themes_ano_prova
ON public.essay_themes (year, edition)
WHERE year IS NOT NULL;

-- Índices úteis para consulta no banco de questões
CREATE INDEX IF NOT EXISTS idx_questions_ano ON public.questions (ano);
CREATE INDEX IF NOT EXISTS idx_questions_area ON public.questions (area);
CREATE INDEX IF NOT EXISTS idx_questions_disciplina ON public.questions (disciplina);
CREATE INDEX IF NOT EXISTS idx_essay_themes_year ON public.essay_themes (year DESC);