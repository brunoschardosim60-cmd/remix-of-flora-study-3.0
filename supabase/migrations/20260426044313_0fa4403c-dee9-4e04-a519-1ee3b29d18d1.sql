CREATE OR REPLACE FUNCTION public.question_stats()
RETURNS TABLE(question_id uuid, total bigint, acertos bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT question_id, COUNT(*)::bigint AS total, COUNT(*) FILTER (WHERE acertou)::bigint AS acertos
  FROM public.question_attempts
  GROUP BY question_id
  HAVING COUNT(*) >= 3
$$;

GRANT EXECUTE ON FUNCTION public.question_stats() TO authenticated;