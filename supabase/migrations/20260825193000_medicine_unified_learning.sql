-- Unified educational learning state. Never store patient-identifiable content.
ALTER TABLE public.medicine_progress
  ADD COLUMN IF NOT EXISTS learning_state jsonb NOT NULL DEFAULT '{"version":1,"items":{}}'::jsonb,
  ADD COLUMN IF NOT EXISTS case_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_section text NOT NULL DEFAULT 'home';

COMMENT ON COLUMN public.medicine_progress.learning_state IS 'Attempts, review status and competency aggregates for educational activities only.';
COMMENT ON COLUMN public.medicine_progress.case_progress IS 'Per-simulation educational completion counters; no patient information.';
COMMENT ON COLUMN public.medicine_progress.last_section IS 'Last medicine learning section used for continuity between devices.';
