
CREATE INDEX IF NOT EXISTS idx_questions_ano_numero ON public.questions (ano DESC NULLS LAST, numero ASC);
CREATE INDEX IF NOT EXISTS idx_weekly_slots_user_dia_hor ON public.weekly_slots (user_id, dia, horario);
CREATE INDEX IF NOT EXISTS idx_study_topics_user_date ON public.study_topics (user_id, study_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_start ON public.study_sessions (user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_spaced_reviews_user_pending ON public.spaced_reviews (user_id) WHERE completed = false;
