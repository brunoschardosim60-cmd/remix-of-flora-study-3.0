INSERT INTO public.tier_limits (tier, action_type, daily_limit) VALUES
  ('free', 'analyze_and_suggest', 20),
  ('free', 'decide_next_topic', 20),
  ('free', 'chat', 30),
  ('free', 'solve_math', 10),
  ('free', 'correct_essay', 3),
  ('free', 'generate_quiz', 10),
  ('free', 'generate_flashcards', 10),
  ('pro', 'analyze_and_suggest', 200),
  ('pro', 'decide_next_topic', 200),
  ('pro', 'chat', 500),
  ('pro', 'solve_math', 200),
  ('pro', 'correct_essay', 50),
  ('pro', 'generate_quiz', 200),
  ('pro', 'generate_flashcards', 200)
ON CONFLICT (tier, action_type) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;