
-- ========== quiz_battles ==========
CREATE TABLE public.quiz_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  group_id UUID NULL REFERENCES public.study_groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','running','finished','cancelled')),
  source TEXT NOT NULL CHECK (source IN ('banco','manual','flora')),
  topic TEXT NULL,
  materia TEXT NULL,
  question_count INT NOT NULL DEFAULT 10,
  seconds_per_question INT NOT NULL DEFAULT 20,
  current_question INT NOT NULL DEFAULT 0,
  question_started_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_quiz_battles_host ON public.quiz_battles(host_id);
CREATE INDEX idx_quiz_battles_group ON public.quiz_battles(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_quiz_battles_status_created ON public.quiz_battles(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_battles TO authenticated;
GRANT ALL ON public.quiz_battles TO service_role;

ALTER TABLE public.quiz_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read battles"
  ON public.quiz_battles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host creates own battle"
  ON public.quiz_battles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host updates own battle"
  ON public.quiz_battles FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host deletes own battle"
  ON public.quiz_battles FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

CREATE TRIGGER trg_quiz_battles_updated_at
  BEFORE UPDATE ON public.quiz_battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== quiz_battle_questions ==========
CREATE TABLE public.quiz_battle_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.quiz_battles(id) ON DELETE CASCADE,
  position INT NOT NULL,
  enunciado TEXT NOT NULL,
  alternativas JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL,
  explicacao TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_id, position)
);
CREATE INDEX idx_qbq_battle ON public.quiz_battle_questions(battle_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_battle_questions TO authenticated;
GRANT ALL ON public.quiz_battle_questions TO service_role;

ALTER TABLE public.quiz_battle_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read battle questions"
  ON public.quiz_battle_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host manages own battle questions"
  ON public.quiz_battle_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_battles b WHERE b.id = battle_id AND b.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_battles b WHERE b.id = battle_id AND b.host_id = auth.uid()));

-- ========== quiz_battle_players ==========
CREATE TABLE public.quiz_battle_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.quiz_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT NULL,
  score INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_id, user_id)
);
CREATE INDEX idx_qbp_battle_score ON public.quiz_battle_players(battle_id, score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_battle_players TO authenticated;
GRANT ALL ON public.quiz_battle_players TO service_role;

ALTER TABLE public.quiz_battle_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read players"
  ON public.quiz_battle_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "User joins as self"
  ON public.quiz_battle_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User leaves as self or host removes"
  ON public.quiz_battle_players FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.quiz_battles b WHERE b.id = battle_id AND b.host_id = auth.uid())
  );

-- Host atualiza score via service role na edge function; permite o host editar caso necessário.
CREATE POLICY "Host updates players score"
  ON public.quiz_battle_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_battles b WHERE b.id = battle_id AND b.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_battles b WHERE b.id = battle_id AND b.host_id = auth.uid()));

-- ========== quiz_battle_answers ==========
CREATE TABLE public.quiz_battle_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.quiz_battles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_battle_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  choice_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_ms INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
CREATE INDEX idx_qba_battle ON public.quiz_battle_answers(battle_id);
CREATE INDEX idx_qba_question ON public.quiz_battle_answers(question_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_battle_answers TO authenticated;
GRANT ALL ON public.quiz_battle_answers TO service_role;

ALTER TABLE public.quiz_battle_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read answers"
  ON public.quiz_battle_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "User inserts own answer"
  ON public.quiz_battle_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========== Realtime ==========
ALTER TABLE public.quiz_battles REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_battle_questions REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_battle_players REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_battle_answers REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_battle_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_battle_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_battle_answers;
