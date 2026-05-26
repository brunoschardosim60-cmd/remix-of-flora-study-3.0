UPDATE public.flora_decisions
SET accepted = false
WHERE accepted IS NULL
  AND decision_type = 'reduce_load';