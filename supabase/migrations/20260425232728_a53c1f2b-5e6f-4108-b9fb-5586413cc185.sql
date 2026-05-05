
DROP POLICY IF EXISTS "Anyone read enem-questions object" ON storage.objects;

-- Leitura de arquivo individual (o cliente fornece o caminho exato): liberada
CREATE POLICY "Read enem-questions individual files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'enem-questions'
    AND name IS NOT NULL
    AND name <> ''
  );

-- Listagem completa do bucket: só admins
CREATE POLICY "Admins list enem-questions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'enem-questions'
    AND public.is_admin_user()
  );
