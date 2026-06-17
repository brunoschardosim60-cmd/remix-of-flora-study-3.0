// Insights derivados para a página de Análise.
// Mantém lógica pura (sem JSX, sem fetch) para facilitar teste e reuso.

export interface SessionLike {
  created_at: string;
  duration_ms: number;
}

export interface AttemptLike {
  created_at: string;
  acertou: boolean;
  question?: { disciplina?: string | null } | null;
}

export interface HeatCell {
  day: number; // 0=Dom .. 6=Sáb
  hour: number; // 0..23
  minutes: number;
}

export interface SubjectAlert {
  materia: string;
  recentAccuracy: number; // 0..1
  prevAccuracy: number;   // 0..1
  deltaPct: number;       // (recent - prev) * 100
  recentCount: number;
  prevCount: number;
  direction: "down" | "up";
}

/**
 * Soma minutos por (dia da semana × hora) com base em created_at.
 * Retorna matriz 7×24.
 */
export function computeHourDayHeatmap(sessions: SessionLike[]): HeatCell[] {
  const grid: HeatCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) grid.push({ day: d, hour: h, minutes: 0 });
  }
  for (const s of sessions) {
    const dt = new Date(s.created_at);
    if (Number.isNaN(dt.getTime())) continue;
    const d = dt.getDay();
    const h = dt.getHours();
    grid[d * 24 + h].minutes += Math.round((s.duration_ms || 0) / 60000);
  }
  return grid;
}

/**
 * Encontra o bucket (dia × hora) com mais minutos estudados.
 * Útil pra mensagem "você rende mais às quartas, 20h".
 */
export function peakStudyBucket(grid: HeatCell[]): HeatCell | null {
  let best: HeatCell | null = null;
  for (const c of grid) {
    if (!best || c.minutes > best.minutes) best = c;
  }
  return best && best.minutes > 0 ? best : null;
}

/**
 * Detecta quedas de acerto >= 10 pp por matéria comparando as últimas 2 semanas
 * com as 2 semanas anteriores. Requer >= 5 tentativas em cada janela pra evitar ruído.
 */
export function computeSubjectAlerts(
  attempts: AttemptLike[],
  now: Date = new Date(),
): SubjectAlert[] {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const recentCutoff = now.getTime() - TWO_WEEKS_MS;
  const prevCutoff = now.getTime() - 2 * TWO_WEEKS_MS;

  const buckets = new Map<string, { recentHit: number; recentTot: number; prevHit: number; prevTot: number }>();
  for (const a of attempts) {
    const materia = (a.question?.disciplina || "").trim();
    if (!materia) continue;
    const t = new Date(a.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < prevCutoff) continue;
    const b = buckets.get(materia) || { recentHit: 0, recentTot: 0, prevHit: 0, prevTot: 0 };
    if (t >= recentCutoff) {
      b.recentTot += 1;
      if (a.acertou) b.recentHit += 1;
    } else {
      b.prevTot += 1;
      if (a.acertou) b.prevHit += 1;
    }
    buckets.set(materia, b);
  }

  const alerts: SubjectAlert[] = [];
  for (const [materia, b] of buckets) {
    if (b.recentTot < 5 || b.prevTot < 5) continue;
    const recentAcc = b.recentHit / b.recentTot;
    const prevAcc = b.prevHit / b.prevTot;
    const deltaPct = (recentAcc - prevAcc) * 100;
    if (Math.abs(deltaPct) < 10) continue;
    alerts.push({
      materia,
      recentAccuracy: recentAcc,
      prevAccuracy: prevAcc,
      deltaPct,
      recentCount: b.recentTot,
      prevCount: b.prevTot,
      direction: deltaPct < 0 ? "down" : "up",
    });
  }
  // Quedas primeiro, mais grave no topo.
  alerts.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "down" ? -1 : 1;
    return a.deltaPct - b.deltaPct;
  });
  return alerts;
}

export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;