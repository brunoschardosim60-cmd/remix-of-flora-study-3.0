import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Lê o objetivo do aluno (`student_onboarding.objetivo`) e deriva
 * a rota/label do "Banco" — concurso vs ENEM.
 * Mantém a lógica fora do Index para que outros consumidores
 * (Header, BottomNav) possam reutilizar no futuro.
 */
export function useStudentObjetivo(user: User | null) {
  const [objetivo, setObjetivo] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_onboarding")
      .select("objetivo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setObjetivo(data?.objetivo ?? ""));
  }, [user]);

  const isConcurso = objetivo === "concurso";
  const bancoRoute = isConcurso ? "/banco-concurso" : "/banco";
  const bancoLabel = isConcurso ? "Banco Concurso" : "Banco";

  return { objetivo, isConcurso, bancoRoute, bancoLabel };
}