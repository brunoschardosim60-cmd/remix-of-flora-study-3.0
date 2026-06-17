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

  // Últimas 5 redações para evolução por competência (apenas ENEM tem c1..c5)
  const last5 = corrected.slice(-5);
  const competencias = [1, 2, 3, 4, 5] as const;
  const compSeries = competencias.map((n) => {
    const key = `competencia_${n}` as const;
    const values = last5
      .map((e) => (e as any)[key] as number | null)
      .filter((v): v is number => typeof v === "number");
    let trend: "up" | "down" | "flat" = "flat";
    if (values.length >= 3) {
      const tail = values.slice(-2);
      const head = values.slice(0, values.length - 2);
      const avgTail = tail.reduce((a, b) => a + b, 0) / tail.length;
      const avgHead = head.reduce((a, b) => a + b, 0) / head.length;
      const diff = avgTail - avgHead;
      if (diff > 8) trend = "up";
      else if (diff < -8) trend = "down";
    } else if (values.length === 2) {
      const diff = values[1] - values[0];
      if (diff > 8) trend = "up";
      else if (diff < -8) trend = "down";
    }
    return { n, values, trend, last: values[values.length - 1] ?? null };
  });

  const COMP_LABELS: Record<number, string> = {
    1: "Norma culta",
    2: "Compreensão",
    3: "Argumentação",
    4: "Coesão",
    5: "Proposta",
  };

  function Sparkline({ values }: { values: number[] }) {
    if (values.length < 2) {
      return <div className="h-6 w-full rounded bg-muted/40" />;
    }
    const w = 80;
    const h = 24;
    const max = 200;
    const step = w / (values.length - 1);
    const points = values
      .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
      .join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-full" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary"
        />
      </svg>
    );
  }

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

      {isENEM && last5.length >= 2 && compSeries.some((c) => c.values.length >= 2) && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Evolução por competência · últimas {last5.length}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {compSeries.map((c) => {
              const Icon = c.trend === "up" ? TrendingUp : c.trend === "down" ? TrendingDown : Minus;
              const cls =
                c.trend === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : c.trend === "down"
                    ? "text-destructive"
                    : "text-muted-foreground";
              return (
                <div key={c.n} className="rounded-lg border border-border/60 bg-background/40 p-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      C{c.n} · {COMP_LABELS[c.n]}
                    </span>
                    <Icon className={`h-3 w-3 ${cls}`} />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-heading text-sm font-semibold">
                      {c.last !== null ? c.last : "—"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">/200</span>
                  </div>
                  <div className="mt-1">
                    <Sparkline values={c.values} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
