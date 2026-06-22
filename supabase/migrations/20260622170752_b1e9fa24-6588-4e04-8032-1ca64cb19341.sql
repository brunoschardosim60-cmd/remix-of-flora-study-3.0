ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_community_created ON public.posts(community_id, created_at DESC);