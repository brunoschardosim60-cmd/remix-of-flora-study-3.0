ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS incomplete boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS questions_incomplete_idx ON public.questions(incomplete) WHERE incomplete = true;

-- Marca automaticamente as 8 questões já identificadas como quebradas
UPDATE public.questions
SET incomplete = true
WHERE
  jsonb_array_length(alternativas) < 5
  OR length(enunciado) < 30
  OR correta IS NULL
  OR correta = '';