
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

DROP POLICY IF EXISTS "Public profiles are viewable by anyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by anyone"
ON public.profiles
FOR SELECT
USING (is_public = true);

ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public gamification viewable" ON public.gamification_profiles;
CREATE POLICY "Public gamification viewable"
ON public.gamification_profiles
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = gamification_profiles.user_id AND p.is_public = true));
