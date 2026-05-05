-- Criar usuário admin diretamente
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_existing uuid;
BEGIN
  -- Verifica se já existe
  SELECT id INTO v_existing FROM auth.users WHERE email = 'studyflow@study.com';
  
  IF v_existing IS NOT NULL THEN
    -- Atualiza senha e confirma email do usuário existente
    UPDATE auth.users
    SET encrypted_password = crypt('Adminstudy@', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_existing;
    v_user_id := v_existing;
  ELSE
    -- Insere novo usuário
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'studyflow@study.com',
      crypt('Adminstudy@', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"StudyFlow Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'studyflow@study.com', 'email_verified', true),
      'email', v_user_id::text,
      now(), now(), now()
    );
  END IF;

  -- Garante profile como admin
  INSERT INTO public.profiles (id, display_name, is_admin)
  VALUES (v_user_id, 'StudyFlow Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true, display_name = 'StudyFlow Admin', updated_at = now();

  -- Garante user_tier
  INSERT INTO public.user_tiers (user_id, tier)
  VALUES (v_user_id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
END $$;