
-- =========================================
-- ESSAY THEMES
-- =========================================
CREATE TABLE public.essay_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER,
  edition TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL,
  eixo TEXT NOT NULL DEFAULT 'outros',
  dificuldade TEXT NOT NULL DEFAULT 'medio',
  nivel_enem INTEGER NOT NULL DEFAULT 3,
  competencias_destaque TEXT[] NOT NULL DEFAULT '{}',
  repertorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposta_modelo TEXT NOT NULL DEFAULT '',
  texto_motivador TEXT NOT NULL DEFAULT '',
  prova_url TEXT NOT NULL DEFAULT '',
  is_official BOOLEAN NOT NULL DEFAULT false,
  origem TEXT NOT NULL DEFAULT 'enem_oficial',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_essay_themes_year ON public.essay_themes(year);
CREATE INDEX idx_essay_themes_eixo ON public.essay_themes(eixo);
CREATE INDEX idx_essay_themes_origem ON public.essay_themes(origem);

ALTER TABLE public.essay_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read themes"
  ON public.essay_themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage themes"
  ON public.essay_themes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE TRIGGER trg_essay_themes_updated_at
  BEFORE UPDATE ON public.essay_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- USER THEME STATUS
-- =========================================
CREATE TABLE public.user_theme_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme_id UUID NOT NULL REFERENCES public.essay_themes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'nao_escrevi',
  essay_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, theme_id)
);

CREATE INDEX idx_user_theme_status_user ON public.user_theme_status(user_id);

ALTER TABLE public.user_theme_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own theme status"
  ON public.user_theme_status FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all theme status"
  ON public.user_theme_status FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE TRIGGER trg_user_theme_status_updated_at
  BEFORE UPDATE ON public.user_theme_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- QUESTIONS (Banco de Questões)
-- =========================================
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER,
  prova TEXT NOT NULL DEFAULT 'regular',
  dia INTEGER,
  caderno TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  disciplina TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL DEFAULT '',
  numero INTEGER,
  enunciado TEXT NOT NULL DEFAULT '',
  alternativas JSONB NOT NULL DEFAULT '[]'::jsonb,
  correta TEXT NOT NULL DEFAULT '',
  explicacao TEXT NOT NULL DEFAULT '',
  tem_imagem BOOLEAN NOT NULL DEFAULT false,
  imagem_urls TEXT[] NOT NULL DEFAULT '{}',
  fonte_pdf TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT 'enem_oficial',
  nivel_enem INTEGER NOT NULL DEFAULT 3,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_ano ON public.questions(ano);
CREATE INDEX idx_questions_area ON public.questions(area);
CREATE INDEX idx_questions_disciplina ON public.questions(disciplina);
CREATE INDEX idx_questions_origem ON public.questions(origem);
CREATE UNIQUE INDEX idx_questions_unique_official
  ON public.questions(ano, prova, caderno, numero)
  WHERE origem = 'enem_oficial' AND ano IS NOT NULL AND numero IS NOT NULL;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage questions"
  ON public.questions FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- QUESTION ATTEMPTS
-- =========================================
CREATE TABLE public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  alternativa_marcada TEXT NOT NULL DEFAULT '',
  acertou BOOLEAN NOT NULL DEFAULT false,
  tempo_ms INTEGER NOT NULL DEFAULT 0,
  modo TEXT NOT NULL DEFAULT 'livre',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_attempts_user ON public.question_attempts(user_id);
CREATE INDEX idx_question_attempts_question ON public.question_attempts(question_id);
CREATE INDEX idx_question_attempts_user_acertou ON public.question_attempts(user_id, acertou);

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attempts"
  ON public.question_attempts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all attempts"
  ON public.question_attempts FOR SELECT
  USING (public.is_admin_user());

-- =========================================
-- STORAGE BUCKET: enem-questions
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('enem-questions', 'enem-questions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read enem-questions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'enem-questions');

CREATE POLICY "Admins upload enem-questions"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'enem-questions' AND public.is_admin_user());

CREATE POLICY "Admins update enem-questions"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'enem-questions' AND public.is_admin_user());

CREATE POLICY "Admins delete enem-questions"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'enem-questions' AND public.is_admin_user());
