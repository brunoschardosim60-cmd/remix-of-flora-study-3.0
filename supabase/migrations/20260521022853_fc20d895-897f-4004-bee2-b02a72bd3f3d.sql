ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL;

COMMENT ON COLUMN public.lessons.cover_image_url IS
  'URL da imagem de capa (gerada por flora-images ou buscada via Unsplash/Pexels/Pixabay).';