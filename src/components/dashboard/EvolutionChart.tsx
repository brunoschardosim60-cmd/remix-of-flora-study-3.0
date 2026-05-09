import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

interface Session { created_at: string; duration_ms: number; }
interface Action { created_at: string; action: string; metadata: Record<string, unknown>; }

interface Props {
  sessions: Session[];
  actions: Action[];
  days?: number;
}

/**
 * Linha de evolução dos últimos N dias:
 *  - horas/dia (eixo esquerdo)
 *  - % acerto média móvel 7d (eixo direito)
 */
export function EvolutionChart({ sessions, actions, days = 30 }: Props) {
  const data = useMemo(() => {
    const list = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split("T")[0];
    });

    // horas por dia
    const horas = new Map<string, number>();
    for (const s of sessions) {
      const d = s.created_at.split("T")[0];
      horas.set(d, (horas.get(d) || 0) + (s.duration_ms || 0) / 3600000);
    }

    // acerto por dia: usa actions tipo quiz_answer com metadata.correct
    const correctsByDay = new Map<string, { c: number; t: number }>();
    for (const a of actions) {
      if (a.action !== "quiz_answer") continue;
      const d = a.created_at.split("T")[0];
      const isCorrect = (a.metadata as any)?.correct === true || (a.metadata as any)?.acertou === true;
      const cur = correctsByDay.get(d) || { c: 0, t: 0 };
      cur.t += 1;
      if (isCorrect) cur.c += 1;
      correctsByDay.set(d, cur);
    }

    // média móvel 7d
    return list.map((date, idx) => {
      const window = list.slice(Math.max(0, idx - 6), idx + 1);
      let cTot = 0, tTot = 0;
      for (const w of window) {
        const v = correctsByDay.get(w);
        if (v) { cTot += v.c; tTot += v.t; }
      }
      const acc = tTot > 0 ? Math.round((cTot / tTot) * 100) : null;
      const dt = new Date(date + "T12:00:00");
      return {
        date,
        label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        horas: Number(((horas.get(date) || 0)).toFixed(2)),
        acerto: acc,
      };
    });
  }, [sessions, actions, days]);

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Evolução — {days} dias</h2>
        <span className="text-xs text-muted-foreground">Horas/dia · % acerto (média móvel 7d)</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(days / 10)} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="horas" name="Horas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="acerto" name="% Acerto" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}