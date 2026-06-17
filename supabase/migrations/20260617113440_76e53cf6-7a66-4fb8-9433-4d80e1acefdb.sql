-- Pacote 3: índices para reduzir latência das queries de contexto da Flora.
CREATE INDEX IF NOT EXISTS idx_essays_user_created ON public.essays (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_topics_user_updated ON public.study_topics (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON public.study_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flora_decisions_user_created ON public.flora_decisions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_slots_user_dia ON public.weekly_slots (user_id, dia);
CREATE INDEX IF NOT EXISTS idx_notebook_pages_notebook_page ON public.notebook_pages (notebook_id, page_number);
CREATE INDEX IF NOT EXISTS idx_student_performance_user_prio ON public.student_performance (user_id, prioridade DESC);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_created ON public.question_attempts (user_id, created_at DESC);