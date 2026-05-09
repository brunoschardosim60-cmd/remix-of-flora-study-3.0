import { useMemo } from "react";

interface Session { created_at: string; duration_ms: number; subject: string | null; }

interface Props {
  sessions: Session[];
  days?: number;
}

/**
 * Mapa de calor: linhas = matérias, colunas = últimos N dias.
 * Intensidade da cor = tempo estudado naquele dia (HSL primary com alpha variável).
 */
export function SubjectHeatmap({ sessions, days = 14 }: Props) {
  const { subjects, dates, grid, max } = useMemo(() => {
    const dateList: string[] = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split("T")[0];
    });
    const subjSet = new Set<string>();
    const cellMap = new Map<string, number>(); // key: subj|date -> ms
    for (const s of sessions) {
      const subj = s.subject || "Outro";
      const date = s.created_at.split("T")[0];
      if (!dateList.includes(date)) continue;
      subjSet.add(subj);
      const key = `${subj}|${date}`;
      cellMap.set(key, (cellMap.get(key) || 0) + (s.duration_ms || 0));
    }
    const subjList = Array.from(subjSet).sort();
    let m = 0;
    cellMap.forEach(v => { if (v > m) m = v; });
    const grid = subjList.map(subj =>
      dateList.map(date => cellMap.get(`${subj}|${date}`) || 0)
    );
    return { subjects: subjList, dates: dateList, grid, max: m };
  }, [sessions, days]);

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem sessões registradas no período.</p>
      </div>
    );
  }

  const fmtMin = (ms: number) => {
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m}min`;
    return `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}` : ""}`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Mapa de calor — {days} dias</h2>
        <span className="text-xs text-muted-foreground">Intensidade = tempo estudado</span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* header dias */}
          <div className="flex gap-1 pl-24">
            {dates.map(d => {
              const dt = new Date(d + "T12:00:00");
              return (
                <div key={d} className="w-6 text-center text-[10px] text-muted-foreground">
                  {dt.getDate()}
                </div>
              );
            })}
          </div>
          {/* linhas */}
          {subjects.map((subj, si) => (
            <div key={subj} className="mt-1 flex items-center gap-1">
              <div className="w-24 truncate pr-2 text-xs font-medium" title={subj}>
                {subj}
              </div>
              {grid[si].map((v, di) => {
                const intensity = max > 0 ? Math.min(v / max, 1) : 0;
                const alpha = v === 0 ? 0.05 : 0.15 + intensity * 0.75;
                return (
                  <div
                    key={di}
                    className="h-6 w-6 rounded-sm border border-border/40"
                    style={{ background: `hsl(var(--primary) / ${alpha})` }}
                    title={`${subj} · ${dates[di]}: ${fmtMin(v)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        {[0.05, 0.25, 0.5, 0.75, 0.95].map(a => (
          <div key={a} className="h-3 w-3 rounded-sm" style={{ background: `hsl(var(--primary) / ${a})` }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}