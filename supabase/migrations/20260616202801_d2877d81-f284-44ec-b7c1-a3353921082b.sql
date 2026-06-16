
DROP POLICY IF EXISTS "ocr_cache_insert" ON public.ocr_cache;
DROP POLICY IF EXISTS "ocr_cache_update" ON public.ocr_cache;
REVOKE INSERT, UPDATE ON public.ocr_cache FROM authenticated;
