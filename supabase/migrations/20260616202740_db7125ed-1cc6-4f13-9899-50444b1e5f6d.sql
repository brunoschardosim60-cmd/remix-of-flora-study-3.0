
ALTER TABLE public.flora_chat_messages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.ocr_cache (
  hash text PRIMARY KEY,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hits int NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE ON public.ocr_cache TO authenticated;
GRANT ALL ON public.ocr_cache TO service_role;
ALTER TABLE public.ocr_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocr_cache_select" ON public.ocr_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "ocr_cache_insert" ON public.ocr_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ocr_cache_update" ON public.ocr_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.tier_limits (tier, action_type, daily_limit) VALUES
  ('free', 'ocr_extract', 10),
  ('pro', 'ocr_extract', 100),
  ('pro_plus', 'ocr_extract', 1000),
  ('free', 'chat_audio', 10),
  ('pro', 'chat_audio', 100),
  ('pro_plus', 'chat_audio', 1000)
ON CONFLICT (tier, action_type) DO NOTHING;
