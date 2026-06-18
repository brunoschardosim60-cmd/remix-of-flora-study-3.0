import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INTERVALS = [1, 3, 7, 15];

// Cache local de feriados nacionais (preenchido por useFeriados; ler aqui evita acoplar a hook)
function getFeriadosCached(year: number): Set<string> {
  try {
    const raw = localStorage.getItem(`feriados_br_${year}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as Array<{ date: string }>;
    return new Set(arr.map((f) => f.date));
  } catch { return new Set(); }
}

/**
 * Adiciona variação aleatória de até ±1 dia em intervalos >=4 dias.
 * Evita que todas as revisões agendadas no mesmo dia caiam exatamente no mesmo
 * dia futuro, criando picos de revisão.
 */
function fuzzDays(days: number, random: () => number = Math.random): number {
  if (days < 4) return days;
  const amplitude = Math.min(2, Math.max(1, Math.round(days * 0.1)));
  const delta = Math.round((random() * 2 - 1) * amplitude);
  return Math.max(1, days + delta);
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Empurra a data até cair num dia útil (não-feriado). Máx 5 deslocamentos. */
function avoidFeriado(dateStr: string): string {
  const year = Number(dateStr.slice(0, 4));
  const feriados = getFeriadosCached(year);
  if (feriados.size === 0) return dateStr;
  let d = new Date(dateStr);
  for (let i = 0; i < 5; i++) {
    const s = d.toISOString().split("T")[0];
    if (!feriados.has(s)) return s;
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Schedule spaced reviews for a topic at intervals (default: 1, 3, 7, 15 days).
 * Idempotent per (user_id, topic_id, scheduled_date).
 */
export async function scheduleSpacedReviews(
  userId: string,
  topicId: string,
  materia: string,
  intervals: number[] = DEFAULT_INTERVALS
): Promise<{ created: number; error?: string }> {
  if (!userId || !topicId) return { created: 0, error: "missing ids" };
  const today = new Date();

  const rows = intervals.map((days) => {
    const fuzzed = fuzzDays(days);
    const scheduled = avoidFeriado(addDays(today, fuzzed));
    return {
      user_id: userId,
      topic_id: topicId,
      materia,
      interval_days: fuzzed,
      scheduled_date: scheduled,
      completed: false,
    };
  });

  // Avoid duplicates: read existing for this topic and skip same scheduled_date
  const { data: existing } = await supabase
    .from("spaced_reviews")
    .select("scheduled_date")
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  const existingDates = new Set((existing ?? []).map((r) => r.scheduled_date));
  const toInsert = rows.filter((r) => !existingDates.has(r.scheduled_date));
  if (toInsert.length === 0) return { created: 0 };

  const { error } = await supabase.from("spaced_reviews").insert(toInsert);
  if (error) return { created: 0, error: error.message };
  return { created: toInsert.length };
}
