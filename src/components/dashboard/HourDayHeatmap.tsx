import { useMemo } from "react";
import { Clock } from "lucide-react";
import { computeHourDayHeatmap, peakStudyBucket, DAY_LABELS, type SessionLike } from "@/lib/analiseInsights";

interface HourDayHeatmapProps {
  sessions: SessionLike[];
}

const HOUR_BUCKETS: Array<{ label: string; hours: number[] }> = [
  { label: "0-3", hours: [0, 1, 2, 3] },
  { label: "4-7", hours: [4, 5, 6, 7] },
  { label: "8-11", hours: [8, 9, 10, 11] },
  { label: "12-15", hours: [12, 13, 14, 15] },
  { label: "16-19", hours: [16, 17, 18, 19] },
  { label: "20-23", hours: [20, 21, 22, 23] },
];

export function HourDayHeatmap({ sessions }: HourDayHeatmapProps) {
  const { cells, max, peakLabel } = useMemo(() => {
    const grid = computeHourDayHeatmap(sessions);
    // Agrega em buckets de 4h pra reduzir ruído.
    const cells: number[][] = Array.from({ length: 7 }, () => Array(HOUR_BUCKETS.length).fill(0));
    for (let d = 0; d < 7; d++) {
      HOUR_BUCKETS.forEach((bucket, bi) => {
        cells[d][bi] = bucket.hours.reduce((acc, h) => acc + grid[d * 24 + h].minutes, 0);
      });
    }
    const max = Math.max(1, ...cells.flat());
    const peak = peakStudyBucket(grid);
    const peakLabel = peak
      ? `${DAY_LABELS[peak.day]} às ${String(peak.hour).padStart(2, "0")}h (${peak.minutes}min)`
      : null;
    return { cells, max, peakLabel };
  }, [sessions]);

  const intensity = (v: number) => {
    if (v === 0) return "bg-muted/40";
    const r = v / max;
    if (r < 0.25) return "bg-primary/15";
    if (r < 0.5) return "bg-primary/35";
    if (r < 0.75) return "bg-primary/60";
    return "bg-primary/85";
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <Clock className="h-4 w-4 text-primary" /> Quando você estuda mais
        </h2>
        {peakLabel && (
          <span className="text-xs text-muted-foreground">Pico: {peakLabel}</span>
        )}
      </div>
      <div className="grid grid-cols-[auto_repeat(6,minmax(0,1fr))] gap-1 text-[10px]">
        <div />
        {HOUR_BUCKETS.map((b) => (
          <div key={b.label} className="text-center text-muted-foreground">{b.label}h</div>
        ))}
        {DAY_LABELS.map((day, d) => (
          <>
            <div key={`lbl-${d}`} className="text-muted-foreground">{day}</div>
            {cells[d].map((v, bi) => (
              <div
                key={`${d}-${bi}`}
                title={`${day} ${HOUR_BUCKETS[bi].label}h: ${v}min`}
                className={`h-7 rounded-sm ${intensity(v)} transition-colors`}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}