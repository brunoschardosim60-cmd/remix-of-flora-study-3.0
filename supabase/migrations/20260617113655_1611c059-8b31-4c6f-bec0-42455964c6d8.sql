-- Pacote 4: integridade referencial. NOT VALID evita falha em linhas históricas órfãs;
-- inserts/updates novos passam a ser validados.
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ['ai_usage_logs','user_id','auth.users(id)','CASCADE'],
    ['concurso_ia_attempts','user_id','auth.users(id)','CASCADE'],
    ['concurso_question_attempts','user_id','auth.users(id)','CASCADE'],
    ['concurso_simulado_results','user_id','auth.users(id)','CASCADE'],
    ['essays','user_id','auth.users(id)','CASCADE'],
    ['flora_chat_messages','user_id','auth.users(id)','CASCADE'],
    ['lesson_progress','user_id','auth.users(id)','CASCADE'],
    ['push_subscriptions','user_id','auth.users(id)','CASCADE'],
    ['question_attempts','user_id','auth.users(id)','CASCADE'],
    ['study_goals','user_id','auth.users(id)','CASCADE'],
    ['user_theme_status','user_id','auth.users(id)','CASCADE'],
    ['user_tiers','user_id','auth.users(id)','CASCADE'],
    ['concurso_question_attempts','question_id','public.concurso_questions(id)','CASCADE']
  ];
  r text[];
  cname text;
BEGIN
  FOREACH r SLICE 1 IN ARRAY pairs LOOP
    cname := r[1] || '_' || r[2] || '_fkey';
    -- pula se já existe
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = cname AND conrelid = ('public.' || r[1])::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s ON DELETE %s NOT VALID',
        r[1], cname, r[2], r[3], r[4]
      );
    END IF;
  END LOOP;
END $$;