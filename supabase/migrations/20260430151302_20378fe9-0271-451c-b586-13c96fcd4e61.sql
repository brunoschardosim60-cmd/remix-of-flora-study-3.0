-- 1) Banca no onboarding
ALTER TABLE public.student_onboarding
  ADD COLUMN IF NOT EXISTS banca text NOT NULL DEFAULT '';

-- 2) Banco de questões de concurso (alternativas A-D)
CREATE TABLE IF NOT EXISTS public.concurso_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banca text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  orgao text NOT NULL DEFAULT '',
  disciplina text NOT NULL DEFAULT '',
  tema text NOT NULL DEFAULT '',
  ano integer,
  enunciado text NOT NULL DEFAULT '',
  alternativas jsonb NOT NULL DEFAULT '[]'::jsonb,
  correta text NOT NULL DEFAULT '' CHECK (correta IN ('', 'A','B','C','D')),
  explicacao text NOT NULL DEFAULT '',
  dificuldade text NOT NULL DEFAULT 'medio' CHECK (dificuldade IN ('facil','medio','dificil')),
  tem_imagem boolean NOT NULL DEFAULT false,
  imagem_urls text[] NOT NULL DEFAULT '{}',
  origem text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concurso_questions_banca ON public.concurso_questions(banca);
CREATE INDEX IF NOT EXISTS idx_concurso_questions_disciplina ON public.concurso_questions(disciplina);

ALTER TABLE public.concurso_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read concurso questions"
  ON public.concurso_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage concurso questions"
  ON public.concurso_questions FOR ALL
  USING (is_admin_user()) WITH CHECK (is_admin_user());

CREATE TRIGGER concurso_questions_updated_at
  BEFORE UPDATE ON public.concurso_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) Tentativas em questões de concurso
CREATE TABLE IF NOT EXISTS public.concurso_question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  alternativa_marcada text NOT NULL DEFAULT '',
  acertou boolean NOT NULL DEFAULT false,
  tempo_ms integer NOT NULL DEFAULT 0,
  modo text NOT NULL DEFAULT 'livre',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concurso_attempts_user ON public.concurso_question_attempts(user_id);

ALTER TABLE public.concurso_question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own concurso attempts"
  ON public.concurso_question_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all concurso attempts"
  ON public.concurso_question_attempts FOR SELECT
  USING (is_admin_user());

-- 4) Trilhas padrão de concurso
CREATE TABLE IF NOT EXISTS public.concurso_trilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote text NOT NULL,                -- 'basico' | 'juridico' | 'fiscal'
  disciplina text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  topicos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concurso_trilhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read trilhas"
  ON public.concurso_trilhas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage trilhas"
  ON public.concurso_trilhas FOR ALL
  USING (is_admin_user()) WITH CHECK (is_admin_user());

-- Seed das trilhas
INSERT INTO public.concurso_trilhas (pacote, disciplina, descricao, topicos, ordem) VALUES
  ('basico','Português','Gramática, interpretação e redação oficial','["Interpretação de texto","Concordância","Regência","Crase","Pontuação","Redação oficial"]'::jsonb, 1),
  ('basico','Raciocínio Lógico','Lógica proposicional, sequências e problemas','["Proposições","Tabelas-verdade","Sequências","Problemas lógicos","Análise combinatória"]'::jsonb, 2),
  ('basico','Matemática Básica','Aritmética e matemática financeira','["Porcentagem","Razão e proporção","Regra de três","Juros simples e compostos"]'::jsonb, 3),
  ('basico','Informática','Conceitos básicos para concursos','["Windows","Pacote Office","Internet","Segurança da informação"]'::jsonb, 4),
  ('basico','Atualidades','Fatos recentes Brasil e mundo','["Política","Economia","Meio ambiente","Tecnologia"]'::jsonb, 5),
  ('juridico','Direito Constitucional','CF/88 e princípios','["Princípios fundamentais","Direitos e garantias","Organização do Estado","Poderes"]'::jsonb, 10),
  ('juridico','Direito Administrativo','Atos, agentes e licitações','["Princípios","Atos administrativos","Servidores","Licitações","Improbidade"]'::jsonb, 11),
  ('juridico','Direito Penal','Parte geral e crimes','["Aplicação da lei","Crime","Penas","Crimes contra a Administração"]'::jsonb, 12),
  ('juridico','Direito Civil','Pessoas, bens e obrigações','["Pessoas","Bens","Fatos jurídicos","Obrigações","Contratos"]'::jsonb, 13),
  ('fiscal','Contabilidade','Princípios e demonstrações','["Princípios contábeis","Patrimônio","DRE","Balanço","Lançamentos"]'::jsonb, 20),
  ('fiscal','Direito Tributário','SNT e tributos','["Sistema tributário","Tributos","Obrigação tributária","Crédito tributário"]'::jsonb, 21),
  ('fiscal','Auditoria','Normas e procedimentos','["Normas de auditoria","Controle interno","Papéis de trabalho","Pareceres"]'::jsonb, 22),
  ('fiscal','Administração Pública','Gestão e controle','["Modelos de administração","Planejamento","Orçamento público","Controle"]'::jsonb, 23)
ON CONFLICT DO NOTHING;

CREATE TRIGGER concurso_trilhas_updated_at
  BEFORE UPDATE ON public.concurso_trilhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();