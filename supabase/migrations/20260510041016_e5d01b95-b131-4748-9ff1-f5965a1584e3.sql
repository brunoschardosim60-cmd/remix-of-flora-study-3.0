
ALTER TABLE public.content_cache
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_content_cache_key_expires
  ON public.content_cache (cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_content_cache_tipo_materia
  ON public.content_cache (tipo, materia);
