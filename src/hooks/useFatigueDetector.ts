import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_MS = 60_000;            // 1 min
const COOLDOWN_MS = 2 * 3600_000;  // 2h entre alertas
const WRONG_STREAK_MIN = 3;        // 3 erros seguidos
const LONG_SESSION_MS = 2 * 3600_000; // 2h contínuas

const LS_LAST_ALERT = "flora.fatigue.lastAlertAt";
const LS_SESSION_START = "flora.fatigue.sessionStart";
const LS_LAST_ACTIVE = "flora.presence.lastActive";

/**
 * Detecta fadiga e insere flora_decisions com decision_type='fatigue'.
 * - Streak de 3+ erros nas últimas tentativas (10 min) → fatigue_errors
 * - Sessão contínua > 2h (sem 10+ min de pausa) → fatigue_time
 * Respeita cooldown de 2h entre alertas.
 */
export function useFatigueDetector(userId: string | undefined | null) {
  const lastCheckedAt = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const check = async () => {
      try {
        const now = Date.now();
        const lastAlert = parseInt(localStorage.getItem(LS_LAST_ALERT) || "0", 10);
        if (now - lastAlert < COOLDOWN_MS) return;

        // Sessão contínua: usa lastActive + sessionStart
        const lastActive = parseInt(localStorage.getItem(LS_LAST_ACTIVE) || "0", 10);
        let sessionStart = parseInt(localStorage.getItem(LS_SESSION_START) || "0", 10);
        if (!sessionStart || (lastActive && now - lastActive > 10 * 60_000)) {
          sessionStart = now;
          localStorage.setItem(LS_SESSION_START, String(now));
        }
        const continuous = now - sessionStart;

        // 1) fatigue_time
        if (continuous >= LONG_SESSION_MS) {
          await insertFatigue(userId, "fatigue_time", `Você está estudando há ${Math.round(continuous/3600_000*10)/10}h sem pausa — uma respirada de 10min recarrega a memória.`, { minutes: Math.round(continuous/60_000) });
          localStorage.setItem(LS_LAST_ALERT, String(now));
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
          const streak = rows.slice(0, WRONG_STREAK_MIN).every((r: any) => r.acertou === false);
          if (streak) {
            await insertFatigue(userId, "fatigue_errors", `Você errou ${WRONG_STREAK_MIN} questões seguidas — bora trocar de matéria ou descansar 5min?`, { count: WRONG_STREAK_MIN });
            localStorage.setItem(LS_LAST_ALERT, String(now));
          }
        }
      } catch (e) {
        // silencioso
      }
    };

    // primeira check após 30s
    const initial = setTimeout(() => { if (!cancelled) check(); }, 30_000);
    timer = setInterval(check, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
    };
  }, [userId]);
}

async function insertFatigue(userId: string, subtype: string, reasoning: string, details: Record<string, unknown>) {
  await supabase.from("flora_decisions").insert({
    user_id: userId,
    decision_type: "fatigue",
    reasoning,
    recommendation: { subtype, ...details },
  });
}
