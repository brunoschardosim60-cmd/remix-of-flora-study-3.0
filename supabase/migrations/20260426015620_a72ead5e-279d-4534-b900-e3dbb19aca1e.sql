DELETE FROM public.question_attempts;
DELETE FROM public.questions;
ALTER TABLE public.questions ALTER COLUMN tema SET DEFAULT '';