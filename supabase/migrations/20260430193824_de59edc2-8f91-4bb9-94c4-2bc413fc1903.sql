ALTER TABLE public.concurso_questions DROP CONSTRAINT IF EXISTS concurso_questions_correta_check;
ALTER TABLE public.concurso_questions ADD CONSTRAINT concurso_questions_correta_check
  CHECK (correta = ANY (ARRAY['', 'A', 'B', 'C', 'D', 'E', 'certo', 'errado']));