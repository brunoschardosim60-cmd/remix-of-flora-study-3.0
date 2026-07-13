
CREATE TABLE public.flora_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  mood SMALLINT,
  energy SMALLINT,
  difficulties TEXT,
  wins TEXT,
  notes TEXT,
  raw_conversation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_of)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flora_checkpoints TO authenticated;
GRANT ALL ON public.flora_checkpoints TO service_role;
ALTER TABLE public.flora_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkpoints" ON public.flora_checkpoints FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX flora_checkpoints_user_week_idx ON public.flora_checkpoints (user_id, week_of DESC);

DO $$ BEGIN
  CREATE TYPE public.flora_memory_kind AS ENUM ('strength','weakness','pattern','hypothesis','preference');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.flora_academic_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.flora_memory_kind NOT NULL,
  subject TEXT,
  description TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flora_academic_memory TO authenticated;
GRANT ALL ON public.flora_academic_memory TO service_role;
ALTER TABLE public.flora_academic_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory" ON public.flora_academic_memory FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX flora_academic_memory_user_kind_idx ON public.flora_academic_memory (user_id, kind, active);

CREATE OR REPLACE FUNCTION public.flora_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER flora_checkpoints_touch BEFORE UPDATE ON public.flora_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.flora_touch_updated_at();
CREATE TRIGGER flora_academic_memory_touch BEFORE UPDATE ON public.flora_academic_memory
  FOR EACH ROW EXECUTE FUNCTION public.flora_touch_updated_at();
