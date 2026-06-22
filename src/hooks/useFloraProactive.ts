import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Flora Proativa — Fase 3 do plan.md
 *
 * Insere sugestões em `flora_decisions` com decision_type='proactive' baseadas em:
 *  - Horário (manhã: revisão · tarde: novo conteúdo · noite: 5 questões rápidas)
 *  - Inatividade (> 2 dias sem study_session)
 *  - Desempenho (queda recente em question_attempts)
 *
 * Regras:
 *  - Máx 1 sugestão proativa NÃO LIDA por vez (evita spam)
 *  - Cooldown de 6h entre verificações por subtype
 *  - Apenas 1 check a cada 30min no client
 */

const CHECK_INTERVAL_MS = 30 * 60_000; // 30 min
const COOLDOWN_MS = 6 * 3600_000;       // 6h por subtype
const LS_PREFIX = "flora.proactive.lastAt.";
const ADAPT_THROTTLE_MS = 5 * 60_000;   // re-analisa no máx a cada 5 min

type Subtype = "morning_revision" | "afternoon_topic" | "night_quiz" | "inactivity" | "performance_drop" | "errors_pattern";

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "off" {
  const h = new Date().getHours();
  if (h >= 7 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "off";
}

function cooldownOk(subtype: Subtype): boolean {
  const last = parseInt(localStorage.getItem(LS_PREFIX + subtype) || "0", 10);
  return Date.now() - last > COOLDOWN_MS;
}

function markCooldown(subtype: Subtype) {
  localStorage.setItem(LS_PREFIX + subtype, String(Date.now()));
}

export function useFloraProactive(userId: string | undefined | null) {
  const running = useRef(false);
  const lastAdaptAt = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      if (running.current) return;
      running.current = true;
      try {
        // Limite global: já tem 1 proativa não-lida?
        const { data: pending } = await supabase
          .from("flora_decisions")
          .select("id")
          .eq("user_id", userId)
          .eq("decision_type", "proactive")
          .is("accepted", null)
          .limit(1);
        if (pending && pending.length > 0) return;

        const now = Date.now();
        const since14d = new Date(now - 14 * 86400000).toISOString();
        const since3d  = new Date(now - 3 * 86400000).toISOString();

        const [sessRes, attemptsRes] = await Promise.all([
          supabase.from("study_sessions")
            .select("start_at")
            .eq("user_id", userId)
            .order("start_at", { ascending: false })
            .limit(1),
          supabase.from("question_attempts")
            .select("acertou,created_at,question_id")
            .eq("user_id", userId)
            .gte("created_at", since14d)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        // 1) Inatividade (≥ 2 dias) — prioridade alta
        const lastStart = sessRes.data?.[0]?.start_at as string | undefined;
        const daysSince = lastStart
          ? Math.floor((now - new Date(lastStart).getTime()) / 86400000)
          : 999;
        if (daysSince >= 2 && cooldownOk("inactivity")) {
          await insert(userId, "inactivity",
            `Faz ${daysSince} dias que você não estuda — que tal 10 minutinhos pra não perder o ritmo?`,
            { daysSinceLast: daysSince, action: "start_short_session" });
          markCooldown("inactivity");
          return;
        }

        // 1.5) Flora Mentor — padrão de erros nas últimas 24h
        //      Se errou ≥3 questões da mesma matéria/tema hoje, oferece aula rápida + 3 exercícios.
        if (cooldownOk("errors_pattern")) {
          const since24h = new Date(now - 86400000).toISOString();
          const wrongIds = (attemptsRes.data ?? [])
            .filter((a: any) => !a.acertou && a.created_at >= since24h)
            .map((a: any) => a.question_id)
            .filter(Boolean);
          if (wrongIds.length >= 3) {
            const { data: qs } = await supabase
              .from("questions")
              .select("id, materia, tema")
              .in("id", wrongIds.slice(0, 50));
            // conta por matéria/tema
            const buckets = new Map<string, { materia: string; tema: string; count: number }>();
            for (const q of (qs ?? []) as any[]) {
              const key = `${q.materia || "Geral"}__${q.tema || "-"}`;
              const cur = buckets.get(key) ?? { materia: q.materia || "Geral", tema: q.tema || "", count: 0 };
              cur.count++;
              buckets.set(key, cur);
            }
            const top = Array.from(buckets.values()).sort((a, b) => b.count - a.count)[0];
            if (top && top.count >= 3) {
              const temaLabel = top.tema ? ` em ${top.tema}` : "";
              await insert(userId, "errors_pattern",
                `Você errou ${top.count} questões${temaLabel} hoje. Quer uma explicação rápida e 3 exercícios parecidos?`,
                { materia: top.materia, tema: top.tema, count: top.count, action: "quick_lesson_and_quiz" });
              markCooldown("errors_pattern");
              return;
            }
          }
        }

        // 2) Queda de desempenho (últimos 7d vs anteriores)
        const attempts = attemptsRes.data ?? [];
        const cut = now - 7 * 86400000;
        let rH = 0, rT = 0, pH = 0, pT = 0;
        for (const a of attempts as any[]) {
          const t = new Date(a.created_at).getTime();
          if (t >= cut) { rT++; if (a.acertou) rH++; }
          else { pT++; if (a.acertou) pH++; }
        }
        if (rT >= 5 && pT >= 5 && cooldownOk("performance_drop")) {
          const rAcc = rH / rT, pAcc = pH / pT;
          const delta = (rAcc - pAcc) * 100;
          if (delta <= -8) {
            await insert(userId, "performance_drop",
              `Notei que seu desempenho caiu ${Math.round(Math.abs(delta))}% essa semana. Vamos revisar os pontos fracos juntos?`,
              { recentAcc: Math.round(rAcc * 100), prevAcc: Math.round(pAcc * 100), action: "review_weak" });
            markCooldown("performance_drop");
            return;
          }
        }

        // 3) Proativas por horário (só dispara se não rolou nada recente nesse dia)
        const tod = getTimeOfDay();
        if (tod === "off") return;

        // Já estudou hoje? Se sim, não chama
        const studiedToday = lastStart && (now - new Date(lastStart).getTime()) < 86400000
          && new Date(lastStart).toDateString() === new Date().toDateString();
        if (studiedToday) return;

        if (tod === "morning" && cooldownOk("morning_revision")) {
          await insert(userId, "morning_revision",
            `Bom dia! ☀️ Manhã é o melhor horário pra revisão. Que tal começar pelas pendentes?`,
            { action: "open_revisions" });
          markCooldown("morning_revision");
        } else if (tod === "afternoon" && cooldownOk("afternoon_topic")) {
          await insert(userId, "afternoon_topic",
            `Boa tarde! 📚 Pronto pra encarar um conteúdo novo? Posso sugerir um tema baseado no seu plano.`,
            { action: "suggest_topic" });
          markCooldown("afternoon_topic");
        } else if (tod === "evening" && cooldownOk("night_quiz")) {
          await insert(userId, "night_quiz",
            `Boa noite! 🌙 5 questões rápidas antes de dormir consolidam o que estudou hoje. Topa?`,
            { action: "quick_quiz", count: 5 });
          markCooldown("night_quiz");
        }
      } catch (e) {
        // silencioso
      } finally {
        running.current = false;
      }
    };

    // primeiro check após 45s (depois de bootstrap)
    const initial = setTimeout(() => { if (!cancelled) check(); }, 45_000);
    timer = setInterval(check, CHECK_INTERVAL_MS);

    // ─── Adaptação contínua ─────────────────────────────────────────────
    // Sempre que algo relevante acontece (sessão de estudo salva, tentativa
    // de questão, quiz concluído, ajuste de cronograma, volta após ausência),
    // pedimos pra Flora reanalizar o aluno. Throttle de 5 min evita spam.
    const triggerAdapt = (reason: string) => {
      const now = Date.now();
      if (now - lastAdaptAt.current < ADAPT_THROTTLE_MS) return;
      lastAdaptAt.current = now;
      Promise.all([
        supabase.functions.invoke("flora-engine", { body: { action: "analyze_and_suggest", data: { trigger: reason } } }),
        supabase.functions.invoke("flora-engine", { body: { action: "risk_scan", data: { trigger: reason } } }),
      ])
        .then(() => window.dispatchEvent(new Event("flora-decisions-updated")))
        .catch(() => { /* silent */ });
    };

    const onQuiz = () => triggerAdapt("quiz");
    const onSchedule = () => triggerAdapt("schedule");
    const onReturn = () => triggerAdapt("presence-return");
    const onSession = () => triggerAdapt("study-session");
    window.addEventListener("flora-quiz", onQuiz);
    window.addEventListener("flora-schedule-updated", onSchedule);
    window.addEventListener("flora-presence-return", onReturn);
    window.addEventListener("study-session-saved", onSession);

    // Realtime: novas sessões e tentativas do próprio aluno → adapta
    const channel = supabase
      .channel(`flora-adapt-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_sessions", filter: `user_id=eq.${userId}` }, () => triggerAdapt("session-insert"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "question_attempts", filter: `user_id=eq.${userId}` }, () => triggerAdapt("attempt-insert"))
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
      window.removeEventListener("flora-quiz", onQuiz);
      window.removeEventListener("flora-schedule-updated", onSchedule);
      window.removeEventListener("flora-presence-return", onReturn);
      window.removeEventListener("study-session-saved", onSession);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

async function insert(userId: string, subtype: Subtype, reasoning: string, details: Record<string, unknown>) {
  await supabase.from("flora_decisions").insert({
    user_id: userId,
    decision_type: "proactive",
    reasoning,
    recommendation: { subtype, ...details },
  });
}
