import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Essay } from "@/lib/essays";

interface EssayEvolutionCardProps {
  essays: Essay[];
  isENEM: boolean;
}

export function EssayEvolutionCard({ essays, isENEM }: EssayEvolutionCardProps) {
  const corrected = useMemo(
    () =>
      essays
        .filter((e) => e.status === "corrigida" && typeof e.nota_total === "number")
        .sort((a, b) => {
          const da = new Date(a.corrected_at || a.updated_at || a.created_at).getTime();
          const db = new Date(b.corrected_at || b.updated_at || b.created_at).getTime();
          return da - db;
        }),
    [essays]
  );

  if (corrected.length < 2) return null;

  const last = corrected[corrected.length - 1];
  const prev = corrected[corrected.length - 2];
  const lastScore = last.nota_total as number;
  const prevScore = prev.nota_total as number;
  const delta = lastScore - prevScore;

  const fmt = (n: number) => (isENEM ? Math.round(n).toString() : (n / 100).toFixed(1));
  // Para concurso a nota é armazenada como nota*100 (ex: 7.5 → 750),
  // então o teto real do gráfico é 1000 (= 10.0). Para ENEM é 1000 pontos.
  const max = 1000;

  // Pega últimas 6 para mini timeline
  const timeline = corrected.slice(-6);

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendClass =
    delta > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta < 0
        ? "text-destructive"
        : "text-muted-foreground";

  function relativeLabel(iso: string) {
    const d = new Date(iso);
    const diffDays = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "hoje";
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `${diffDays}d atrás`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 5) return `${weeks} sem atrás`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  const prevLabel = relativeLabel(prev.corrected_at || prev.updated_at || prev.created_at);

  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sua evolução</p>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold">{fmt(lastScore)}</span>
            <span className="text-sm text-muted-foreground">
              {isENEM ? "/ 1000" : "/ 10"}
            </span>
            <span className={`flex items-center gap-1 text-sm font-medium ${trendClass}`}>
              <TrendIcon className="h-4 w-4" />
              {delta > 0 ? "+" : ""}
              {fmt(Math.abs(delta))}{" "}
              <span className="text-xs font-normal text-muted-foreground">vs {prevLabel}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {corrected.length} redações corrigidas
        </p>
      </div>

      {/* Mini timeline */}
      <div className="mt-4 flex items-end gap-1.5 h-16">
        {timeline.map((e, i) => {
          const score = e.nota_total as number;
          const heightPct = Math.max(8, (score / max) * 100);
          const isLast = i === timeline.length - 1;
          return (
            <div
              key={e.id}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`${fmt(score)} · ${new Date(e.corrected_at || e.created_at).toLocaleDateString("pt-BR")}`}
            >
              <div
                className={`w-full rounded-sm transition-all ${
                  isLast ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"
                }`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{fmt(score)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
