-- Fix permission for is_admin_user function
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- Ensure all tables have proper grants (standardizing)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_onboarding TO authenticated;
GRANT ALL ON public.student_onboarding TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.essays TO authenticated;
GRANT ALL ON public.essays TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- Add grants for other tables that might be affected
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaced_reviews TO authenticated;
GRANT ALL ON public.study_goals TO service_role;
GRANT ALL ON public.study_topics TO service_role;
GRANT ALL ON public.study_sessions TO service_role;
GRANT ALL ON public.spaced_reviews TO service_role;
