-- Adiciona coluna metadata ao profiles para armazenar dados flexíveis por usuário.
-- Usado atualmente para sincronizar favoritos do BancoQuestoes entre dispositivos.
-- Tipo JSONB permite campos futuros sem novas migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.metadata IS
  'Dados flexíveis do usuário. Campos usados: banco_favorites (string[]).';
