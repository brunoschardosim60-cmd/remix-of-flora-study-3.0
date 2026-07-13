import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type GoalStatus = "active" | "paused" | "done" | "archived";

export interface StudentGoal {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  target_date: string | null;
  priority: 1 | 2 | 3;
  progress: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export type GoalDraft = Partial<Omit<StudentGoal, "id" | "created_at" | "updated_at">> & {
  title: string;
};

/**
 * CRUD leve de metas do aluno (student_goals_v2).
 * Retorna apenas as ativas por padrão — arquivadas ficam ocultas do dashboard.
 */
export function useStudentGoalsV2(user: User | null) {
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setGoals([]);
      return;
    }
    setLoading(true);
    // Best-effort: recalcula progresso a partir de user_actions antes de ler.
    try {
      await supabase.functions.invoke("flora-engine", { body: { action: "recompute_goal_progress" } });
    } catch { /* ignora falha do recompute */ }
    const { data } = await supabase
      .from("student_goals_v2")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    setGoals((data ?? []) as StudentGoal[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (draft: GoalDraft) => {
    if (!user) return null;
    const { data } = await supabase
      .from("student_goals_v2")
      .insert({ user_id: user.id, ...draft })
      .select("*")
      .single();
    if (data) setGoals((prev) => [data as StudentGoal, ...prev]);
    return data as StudentGoal | null;
  }, [user]);

  const update = useCallback(async (id: string, patch: Partial<StudentGoal>) => {
    const { data } = await supabase
      .from("student_goals_v2")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (data) setGoals((prev) => prev.map((g) => (g.id === id ? (data as StudentGoal) : g)));
    return data as StudentGoal | null;
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("student_goals_v2").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, loading, reload: load, create, update, remove };
}