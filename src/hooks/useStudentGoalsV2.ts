import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const RECOMPUTE_KEY = "flora:goals:lastRecompute";
const RECOMPUTE_TTL_MS = 30 * 60 * 1000; // 30 min

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
    // Best-effort: recalcula progresso, com debounce de 30 min via localStorage.
    try {
      const last = Number(localStorage.getItem(RECOMPUTE_KEY) || 0);
      if (Date.now() - last > RECOMPUTE_TTL_MS) {
        localStorage.setItem(RECOMPUTE_KEY, String(Date.now()));
        await supabase.functions.invoke("flora-engine", { body: { action: "recompute_goal_progress" } });
      }
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

  // Realtime: escuta mudanças nas metas do próprio usuário.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`student_goals_v2:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_goals_v2", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setGoals((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((g) => g.id !== payload.old.id);
          const row = payload.new as StudentGoal;
          const isActive = row.status === "active" || row.status === "paused";
          const exists = prev.some((g) => g.id === row.id);
          if (!isActive) return prev.filter((g) => g.id !== row.id);
          if (exists) return prev.map((g) => (g.id === row.id ? row : g));
          return [row, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
    // Loop com gamificação: registra conclusão como user_action pra a Flora ver e XP subir.
    if (data && patch.status === "done" && user) {
      supabase.from("user_actions").insert({
        user_id: user.id,
        action: "goal_completed",
        metadata: { goal_id: id, title: (data as StudentGoal).title },
      }).then(() => {}, () => {});
    }
    return data as StudentGoal | null;
  }, [user]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("student_goals_v2").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, loading, reload: load, create, update, remove };
}