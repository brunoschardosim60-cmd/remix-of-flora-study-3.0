import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface FloraCheckpoint {
  id: string;
  week_of: string;
  mood: number | null;
  energy: number | null;
  difficulties: string | null;
  wins: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FloraCheckpointDraft = Partial<
  Pick<FloraCheckpoint, "mood" | "energy" | "difficulties" | "wins" | "notes">
>;

/** Retorna a segunda-feira da semana atual em YYYY-MM-DD. */
function currentWeekOf(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/**
 * Gerencia o checkpoint semanal da Flora.
 * - `current`: registro da semana atual (null se ainda não preenchido)
 * - `history`: últimos 8 checkpoints
 * - `save`: upsert por (user_id, week_of)
 */
export function useFloraCheckpoint(user: User | null) {
  const [current, setCurrent] = useState<FloraCheckpoint | null>(null);
  const [history, setHistory] = useState<FloraCheckpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const weekOf = currentWeekOf();

  const load = useCallback(async () => {
    if (!user) {
      setCurrent(null);
      setHistory([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("flora_checkpoints")
      .select("*")
      .eq("user_id", user.id)
      .order("week_of", { ascending: false })
      .limit(8);
    setLoading(false);
    if (error) return;
    const rows = (data ?? []) as FloraCheckpoint[];
    setHistory(rows);
    setCurrent(rows.find((r) => r.week_of === weekOf) ?? null);
  }, [user, weekOf]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (draft: FloraCheckpointDraft) => {
      if (!user) return null;
      const payload = { user_id: user.id, week_of: weekOf, ...draft };
      const { data, error } = await supabase
        .from("flora_checkpoints")
        .upsert(payload, { onConflict: "user_id,week_of" })
        .select("*")
        .single();
      if (error) return null;
      const row = data as FloraCheckpoint;
      setCurrent(row);
      setHistory((prev) => {
        const rest = prev.filter((r) => r.week_of !== weekOf);
        return [row, ...rest].slice(0, 8);
      });
      return row;
    },
    [user, weekOf],
  );

  return { current, history, loading, save, reload: load, weekOf };
}