import { useEffect, useState } from "react";
import { Calendar, TrendingUp, Target, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string | null | undefined;
}

/**
 * Resumo Semanal — mostra (todo dia, com destaque no domingo) o que o aluno fez
 * nos últimos 7 dias: questões resolvidas, % de acerto e pontos previstos no ENEM
 * (estimativa simples baseada em acerto vs baseline 50%).
 */
export function WeeklySummaryCard({ userId }: Props) {
  const [stats, setStats] = useState<{ total: number; hits: number; acc: number; predicted: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("question_attempts")
        .select("acertou")
        .eq("user_id", userId)
        .gte("created_at", since);
      const rows = data ?? [];
      const total = rows.length;
      const hits = rows.filter((r: any) => r.acertou).length;
      const acc = total ? Math.round((hits / total) * 100) : 0;
      // Estimativa: cada 1% acima de 50% ≈ 0.8 pt previsto no ENEM (heurística simples).
      const predicted = total >= 10 ? Math.max(0, Math.round((acc - 50) * 0.8)) : 0;
      setStats({ total, hits, acc, predicted });
      setLoading(false);
    })();
  }, [userId]);

  if (loading || !stats || stats.total === 0) return null;

  const isSunday = new Date().getDay() === 0;

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${isSunday ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <header className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">
          {isSunday ? "Resumo da semana" : "Esta semana"}
        </h2>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="w-3 h-3" /> Questões
          </div>
          <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" /> Acerto
          </div>
          <p className="text-2xl font-bold mt-0.5">{stats.acc}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Award className="w-3 h-3" /> ENEM
          </div>
          <p className="text-2xl font-bold mt-0.5 text-primary">
            {stats.predicted > 0 ? `+${stats.predicted}` : "—"}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        {stats.total < 10
          ? "Resolva mais questões para uma previsão mais precisa."
          : `Estimativa de ganho previsto no ENEM baseada nos seus ${stats.total} acertos da semana.`}
      </p>
    </section>
  );
}