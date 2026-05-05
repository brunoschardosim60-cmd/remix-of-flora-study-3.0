DROP INDEX IF EXISTS public.idx_questions_unique_official;
CREATE UNIQUE INDEX idx_questions_unique_official
ON public.questions (ano, prova, area, numero)
WHERE ano IS NOT NULL AND numero IS NOT NULL;