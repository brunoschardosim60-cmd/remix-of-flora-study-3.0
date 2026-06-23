ALTER TABLE public.quiz_battles 
  ADD COLUMN IF NOT EXISTS auto_advance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reveal_seconds integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS revealing_at timestamptz;

ALTER TABLE public.quiz_battle_players
  ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_count integer NOT NULL DEFAULT 0;