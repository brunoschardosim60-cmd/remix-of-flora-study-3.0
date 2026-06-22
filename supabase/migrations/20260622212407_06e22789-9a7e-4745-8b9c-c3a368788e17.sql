
CREATE TABLE public.flora_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flora_chat_threads TO authenticated;
GRANT ALL ON public.flora_chat_threads TO service_role;
ALTER TABLE public.flora_chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat threads" ON public.flora_chat_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_flora_chat_threads_user_updated ON public.flora_chat_threads(user_id, updated_at DESC);

ALTER TABLE public.flora_chat_messages ADD COLUMN IF NOT EXISTS thread_id uuid;
CREATE INDEX IF NOT EXISTS idx_flora_chat_messages_thread ON public.flora_chat_messages(thread_id, seq);
