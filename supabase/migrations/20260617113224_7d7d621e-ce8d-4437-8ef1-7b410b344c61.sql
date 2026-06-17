-- Pacote 2: fechar leitura ampla dos caches.
-- Edge functions usam service_role e ignoram RLS, então não há impacto funcional.
DROP POLICY IF EXISTS "Authenticated read cache" ON public.content_cache;
DROP POLICY IF EXISTS "ocr_cache_select" ON public.ocr_cache;

-- Garante que admin continua podendo inspecionar via Data API
CREATE POLICY "Admins read ocr_cache"
  ON public.ocr_cache
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());