import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Lê o objetivo do aluno (`student_onboarding.objetivo`) e deriva
 * a rota/label do "Banco" — concurso vs ENEM.
 * Mantém a lógica fora do Index para que outros consumidores
 * (Header, BottomNav) possam reutilizar no futuro.
 */
export function useStudentObjetivo(user: User | null) {
  // Cacheado por React Query — dedupa entre BottomNav, Header, Index, etc.
  // staleTime alto: objetivo muda só no onboarding.
  const { data } = useQuery({
    queryKey: ["student-objetivo", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_onboarding")
        .select("objetivo")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.objetivo ?? "";
    },
  });

  const objetivo = data ?? "";
  const isConcurso = objetivo === "concurso";
  const bancoRoute = isConcurso ? "/banco-concurso" : "/banco";
  const bancoLabel = isConcurso ? "Banco Concurso" : "Banco";

  return { objetivo, isConcurso, bancoRoute, bancoLabel };
}