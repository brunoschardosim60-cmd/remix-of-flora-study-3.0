import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_MS = 60_000;            // 1 min
const COOLDOWN_MS = 2 * 3600_000;  // 2h entre alertas
const WRONG_STREAK_MIN = 3;        // 3 erros seguidos
const LONG_SESSION_MS = 2 * 3600_000; // 2h contínuas

const LS_LAST_ALERT = "flora.fatigue.lastAlertAt";

/**
 * Detecta fadiga e insere flora_decisions com decision_type='fatigue'.
 * - Streak de 3+ erros nas últimas tentativas (10 min) → fatigue_errors
 * - Sessão contínua > 2h (sem 10+ min de pausa) → fatigue_time
 * Respeita cooldown de 2h entre alertas.
 */
export function useFatigueDetector(userId: string | undefined | null) {

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let running = false;
    let sessionStart = Date.now();
    let lastInput = sessionStart;
    const activity = () => {
      const now = Date.now();
      if (now - lastInput > 10 * 60_000) sessionStart = now;
      lastInput = now;
    };
    const visibility = () => { sessionStart = Date.now(); lastInput = sessionStart; };
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, { passive: true });
    document.addEventListener("visibilitychange", visibility);

    const check = async () => {
      if (cancelled || running) return;
      running = true;
      try {
        const now = Date.now();
        if (document.hidden || now - lastInput > 10 * 60_000) { sessionStart = now; return; }
        const lastAlert = parseInt(localStorage.getItem(`${LS_LAST_ALERT}:${userId}`) || "0", 10);
        if (now - lastAlert < COOLDOWN_MS) return;

        // Sessão contínua: usa lastActive + sessionStart
        const continuous = now - sessionStart;

        // 1) fatigue_time
        if (continuous >= LONG_SESSION_MS) {
          await insertFatigue(userId, "fatigue_time", "Você está ativo no site há cerca de 2 horas. Que tal fazer uma pausa? Isso é uma estimativa de atividade, não uma medida de fadiga.", { minutes: Math.round(continuous/60_000) });
          localStorage.setItem(`${LS_LAST_ALERT}:${userId}`, String(now));
          return;
        }

        // 2) fatigue_errors: últimas tentativas 10min
        const since = new Date(now - 10 * 60_000).toISOString();
        const { data } = await supabase
          .from("question_attempts")
          .select("acertou, created_at")
          .eq("user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5);
        const rows = data || [];
        if (rows.length >= WRONG_STREAK_MIN) {
          const streak = rows.slice(0, WRONG_STREAK_MIN).every((r) => r.acertou === false);
          if (streak) {
            await insertFatigue(userId, "fatigue_errors", `Você errou ${WRONG_STREAK_MIN} questões seguidas — bora trocar de matéria ou descansar 5min?`, { count: WRONG_STREAK_MIN });
            localStorage.setItem(`${LS_LAST_ALERT}:${userId}`, String(now));
          }
        }
      } catch {
        // silencioso
      } finally {
        running = false;
      }
    };

    // primeira check após 30s
    const initial = setTimeout(() => { if (!cancelled) check(); }, 30_000);
    timer = setInterval(check, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [userId]);
}

async function insertFatigue(userId: string, subtype: string, reasoning: string, details: Record<string, unknown>) {
  const { error } = await supabase.from("flora_decisions").insert({
    user_id: userId,
    decision_type: "fatigue",
    reasoning,
    recommendation: { subtype, ...details },
  });
  if (error) throw error;
}
