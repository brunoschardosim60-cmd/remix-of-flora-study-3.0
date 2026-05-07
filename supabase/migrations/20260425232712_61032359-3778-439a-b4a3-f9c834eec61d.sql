
-- Substitui a política de leitura pública por uma que só permite acesso direto ao arquivo,
-- não listagem do bucket. Listagem fica restrita a admins.
DROP POLICY IF EXISTS "Public read enem-questions" ON storage.objects;

CREATE POLICY "Public get enem-questions object"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'enem-questions'
    AND (
      -- acesso direto a um arquivo (name fornecido)
      name IS NOT NULL
      AND public.is_admin_user() = false
      AND auth.role() <> 'authenticated_admin'
    )
  );

-- Política mais simples e funcional: leitura pública de arquivos individuais
DROP POLICY IF EXISTS "Public get enem-questions object" ON storage.objects;

CREATE POLICY "Public read enem-questions files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'enem-questions' AND public.is_admin_user());

-- Reescreve corretamente: leitura pública só de objetos individuais (acesso direto via URL),
-- listagem do bucket só para admins.
DROP POLICY IF EXISTS "Public read enem-questions files" ON storage.objects;

CREATE POLICY "Anyone read enem-questions object"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'enem-questions');
