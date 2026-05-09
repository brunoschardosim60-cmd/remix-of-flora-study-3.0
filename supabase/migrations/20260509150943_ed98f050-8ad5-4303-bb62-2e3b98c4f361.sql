INSERT INTO public.tier_limits (tier, action_type, daily_limit) VALUES
  ('free', 'generate_lesson', 5),
  ('pro', 'generate_lesson', 100),
  ('pro_plus', 'generate_lesson', 2000)
ON CONFLICT (tier, action_type) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;