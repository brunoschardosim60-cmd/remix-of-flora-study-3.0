-- Fix search_path for update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Revoke execute from authenticated for any security definer functions in public schema (best practice)
-- Note: This is a general sweep for common Supabase edge function/helper patterns if they exist
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Specifically allow standard PostgREST functions if any (usually not in public)
-- Re-grant execute on our specific trigger function just in case
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
