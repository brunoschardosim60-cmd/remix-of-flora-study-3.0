
-- Tabela para armazenar dados de pré-importação por email
CREATE TABLE IF NOT EXISTS public.pending_user_imports (
  email text PRIMARY KEY,
  payload jsonb NOT NULL,
  imported boolean NOT NULL DEFAULT false,
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_user_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending imports"
ON public.pending_user_imports
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Função que importa os dados pendentes para o novo user_id
CREATE OR REPLACE FUNCTION public.import_pending_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_tables jsonb;
  v_old_uid text;
  v_new_uid uuid := NEW.id;
  v_email text := lower(NEW.email);
  v_row jsonb;
  v_fixed jsonb;
BEGIN
  SELECT payload INTO v_payload
  FROM public.pending_user_imports
  WHERE email = v_email AND imported = false;

  IF v_payload IS NULL THEN
    RETURN NEW;
  END IF;

  v_tables := v_payload->'tables';
  v_old_uid := v_payload->>'user_id';

  -- profiles (upsert: já criado pelo handle_new_user)
  IF jsonb_array_length(COALESCE(v_tables->'profiles', '[]'::jsonb)) > 0 THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_tables->'profiles') LOOP
      UPDATE public.profiles
      SET display_name = COALESCE(v_row->>'display_name', display_name),
          avatar_url = v_row->>'avatar_url',
          updated_at = now()
      WHERE id = v_new_uid;
    END LOOP;
  END IF;

  -- user_tiers (upsert)
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'user_tiers', '[]'::jsonb)) LOOP
    INSERT INTO public.user_tiers (user_id, tier)
    VALUES (v_new_uid, COALESCE(v_row->>'tier', 'free'))
    ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier;
  END LOOP;

  -- student_onboarding (upsert)
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'student_onboarding', '[]'::jsonb)) LOOP
    INSERT INTO public.student_onboarding (
      user_id, objetivo, tempo_disponivel_min, materias_dificeis, rotina, meta_resultado, completed
    ) VALUES (
      v_new_uid,
      COALESCE(v_row->>'objetivo',''),
      COALESCE((v_row->>'tempo_disponivel_min')::int, 60),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_row->'materias_dificeis')), '{}'::text[]),
      COALESCE(v_row->>'rotina',''),
      COALESCE(v_row->>'meta_resultado',''),
      COALESCE((v_row->>'completed')::boolean, false)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      objetivo = EXCLUDED.objetivo,
      tempo_disponivel_min = EXCLUDED.tempo_disponivel_min,
      materias_dificeis = EXCLUDED.materias_dificeis,
      rotina = EXCLUDED.rotina,
      meta_resultado = EXCLUDED.meta_resultado,
      completed = EXCLUDED.completed;
  END LOOP;

  -- study_goals (upsert)
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'study_goals', '[]'::jsonb)) LOOP
    INSERT INTO public.study_goals (user_id, weekly_hours_target, monthly_hours_target, weekly_revisions_target, weekly_topics_target)
    VALUES (
      v_new_uid,
      COALESCE((v_row->>'weekly_hours_target')::numeric, 10),
      COALESCE((v_row->>'monthly_hours_target')::numeric, 40),
      COALESCE((v_row->>'weekly_revisions_target')::int, 15),
      COALESCE((v_row->>'weekly_topics_target')::int, 5)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      weekly_hours_target = EXCLUDED.weekly_hours_target,
      monthly_hours_target = EXCLUDED.monthly_hours_target,
      weekly_revisions_target = EXCLUDED.weekly_revisions_target,
      weekly_topics_target = EXCLUDED.weekly_topics_target;
  END LOOP;

  -- study_topics (insert)
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'study_topics', '[]'::jsonb)) LOOP
    INSERT INTO public.study_topics (
      id, user_id, tema, materia, study_date, skip_weekends_revisions,
      revisions, rating, notas, flashcards, quiz_attempts, quiz_errors, quiz_last_score
    ) VALUES (
      v_row->>'id', v_new_uid,
      COALESCE(v_row->>'tema',''), COALESCE(v_row->>'materia',''),
      COALESCE(v_row->>'study_date', to_char(now(),'YYYY-MM-DD')),
      COALESCE((v_row->>'skip_weekends_revisions')::boolean, false),
      COALESCE(v_row->'revisions', '[]'::jsonb),
      COALESCE((v_row->>'rating')::int, 0),
      COALESCE(v_row->>'notas',''),
      COALESCE(v_row->'flashcards', '[]'::jsonb),
      COALESCE((v_row->>'quiz_attempts')::int, 0),
      COALESCE(v_row->'quiz_errors', '[]'::jsonb),
      NULLIF(v_row->>'quiz_last_score','')::int
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- study_state (upsert)
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'study_state', '[]'::jsonb)) LOOP
    INSERT INTO public.study_state (user_id, topics, weekly_slots, sessions)
    VALUES (
      v_new_uid,
      COALESCE(v_row->'topics', '[]'::jsonb),
      COALESCE(v_row->'weekly_slots', '[]'::jsonb),
      COALESCE(v_row->'sessions', '[]'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      topics = EXCLUDED.topics,
      weekly_slots = EXCLUDED.weekly_slots,
      sessions = EXCLUDED.sessions;
  END LOOP;

  -- study_sessions
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'study_sessions', '[]'::jsonb)) LOOP
    INSERT INTO public.study_sessions (id, user_id, start_at, end_at, duration_ms, subject, topic_id)
    VALUES (
      v_row->>'id', v_new_uid,
      (v_row->>'start_at')::timestamptz,
      NULLIF(v_row->>'end_at','')::timestamptz,
      COALESCE((v_row->>'duration_ms')::int, 0),
      v_row->>'subject', v_row->>'topic_id'
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- weekly_slots
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'weekly_slots', '[]'::jsonb)) LOOP
    INSERT INTO public.weekly_slots (id, user_id, dia, horario, descricao, materia, concluido)
    VALUES (
      v_row->>'id', v_new_uid,
      (v_row->>'dia')::int, v_row->>'horario',
      COALESCE(v_row->>'descricao',''), v_row->>'materia',
      COALESCE((v_row->>'concluido')::boolean,false)
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- spaced_reviews
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'spaced_reviews', '[]'::jsonb)) LOOP
    INSERT INTO public.spaced_reviews (user_id, topic_id, materia, scheduled_date, interval_days, completed, completed_at)
    VALUES (
      v_new_uid, v_row->>'topic_id', v_row->>'materia',
      (v_row->>'scheduled_date')::date,
      COALESCE((v_row->>'interval_days')::int, 1),
      COALESCE((v_row->>'completed')::boolean, false),
      NULLIF(v_row->>'completed_at','')::timestamptz
    );
  END LOOP;

  -- notebooks
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'notebooks', '[]'::jsonb)) LOOP
    INSERT INTO public.notebooks (id, user_id, title, cover_color, folder, is_favorite, subject, topic_id)
    VALUES (
      (v_row->>'id')::uuid, v_new_uid,
      COALESCE(v_row->>'title','Novo Caderno'),
      COALESCE(v_row->>'cover_color','#3B82F6'),
      v_row->>'folder',
      COALESCE((v_row->>'is_favorite')::boolean,false),
      v_row->>'subject', v_row->>'topic_id'
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- notebook_pages
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'notebook_pages', '[]'::jsonb)) LOOP
    INSERT INTO public.notebook_pages (id, user_id, notebook_id, content, drawing_data, page_number, template, tags)
    VALUES (
      (v_row->>'id')::uuid, v_new_uid,
      (v_row->>'notebook_id')::uuid,
      COALESCE(v_row->>'content',''),
      v_row->'drawing_data',
      COALESCE((v_row->>'page_number')::int, 1),
      COALESCE(v_row->>'template','blank'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_row->'tags')),'{}'::text[])
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- essays
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'essays', '[]'::jsonb)) LOOP
    INSERT INTO public.essays (
      id, user_id, tema, texto, tipo_prova, status, line_count, word_count,
      feedback_competencias, feedback_geral, nota_total,
      competencia_1, competencia_2, competencia_3, competencia_4, competencia_5, corrected_at
    ) VALUES (
      (v_row->>'id')::uuid, v_new_uid,
      COALESCE(v_row->>'tema',''), COALESCE(v_row->>'texto',''),
      COALESCE(v_row->>'tipo_prova','enem'), COALESCE(v_row->>'status','rascunho'),
      COALESCE((v_row->>'line_count')::int,0), COALESCE((v_row->>'word_count')::int,0),
      COALESCE(v_row->'feedback_competencias','{}'::jsonb),
      COALESCE(v_row->>'feedback_geral',''),
      NULLIF(v_row->>'nota_total','')::int,
      NULLIF(v_row->>'competencia_1','')::int, NULLIF(v_row->>'competencia_2','')::int,
      NULLIF(v_row->>'competencia_3','')::int, NULLIF(v_row->>'competencia_4','')::int,
      NULLIF(v_row->>'competencia_5','')::int,
      NULLIF(v_row->>'corrected_at','')::timestamptz
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- gamification_profiles
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'gamification_profiles', '[]'::jsonb)) LOOP
    INSERT INTO public.gamification_profiles (user_id, state)
    VALUES (v_new_uid, COALESCE(v_row->'state','{}'::jsonb))
    ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state;
  END LOOP;

  -- flora_chat_messages
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'flora_chat_messages', '[]'::jsonb)) LOOP
    INSERT INTO public.flora_chat_messages (user_id, role, content, seq, created_at)
    VALUES (
      v_new_uid, COALESCE(v_row->>'role','user'),
      COALESCE(v_row->>'content',''),
      COALESCE((v_row->>'seq')::int,0),
      COALESCE((v_row->>'created_at')::timestamptz, now())
    );
  END LOOP;

  -- flora_decisions
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'flora_decisions', '[]'::jsonb)) LOOP
    INSERT INTO public.flora_decisions (user_id, decision_type, reasoning, recommendation, accepted)
    VALUES (
      v_new_uid, COALESCE(v_row->>'decision_type','unknown'),
      COALESCE(v_row->>'reasoning',''),
      COALESCE(v_row->'recommendation','{}'::jsonb),
      NULLIF(v_row->>'accepted','')::boolean
    );
  END LOOP;

  -- user_actions
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'user_actions', '[]'::jsonb)) LOOP
    INSERT INTO public.user_actions (user_id, action, materia, topic_id, metadata)
    VALUES (
      v_new_uid, COALESCE(v_row->>'action','unknown'),
      v_row->>'materia', v_row->>'topic_id',
      COALESCE(v_row->'metadata','{}'::jsonb)
    );
  END LOOP;

  -- ai_usage_logs
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(v_tables->'ai_usage_logs', '[]'::jsonb)) LOOP
    INSERT INTO public.ai_usage_logs (user_id, action_type, model, success, tokens_in, tokens_out, cost_estimate, error_message, metadata)
    VALUES (
      v_new_uid, COALESCE(v_row->>'action_type','unknown'),
      COALESCE(v_row->>'model',''),
      COALESCE((v_row->>'success')::boolean, true),
      COALESCE((v_row->>'tokens_in')::int,0),
      COALESCE((v_row->>'tokens_out')::int,0),
      COALESCE((v_row->>'cost_estimate')::numeric, 0),
      COALESCE(v_row->>'error_message',''),
      COALESCE(v_row->'metadata','{}'::jsonb)
    );
  END LOOP;

  -- Marca como importado
  UPDATE public.pending_user_imports
  SET imported = true, imported_at = now()
  WHERE email = v_email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloqueia o signup se a importação falhar
  RAISE WARNING 'pending import failed for %: %', v_email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger AFTER handle_new_user (para que profiles já exista)
DROP TRIGGER IF EXISTS on_auth_user_pending_import ON auth.users;
CREATE TRIGGER on_auth_user_pending_import
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.import_pending_user_data();
