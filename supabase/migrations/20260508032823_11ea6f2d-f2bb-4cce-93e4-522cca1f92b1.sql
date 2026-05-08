
CREATE TABLE IF NOT EXISTS public.content_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  materia TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL DEFAULT '',
  dificuldade TEXT NOT NULL DEFAULT 'medio',
  banca TEXT NOT NULL DEFAULT '',
  estilo TEXT NOT NULL DEFAULT '',
  objetivo TEXT NOT NULL DEFAULT 'enem',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_cache_lookup
  ON public.content_cache (tipo, materia, tema, dificuldade, banca, estilo, objetivo);

ALTER TABLE public.content_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read cache"
  ON public.content_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage cache"
  ON public.content_cache FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE TRIGGER trg_content_cache_updated
  BEFORE UPDATE ON public.content_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
