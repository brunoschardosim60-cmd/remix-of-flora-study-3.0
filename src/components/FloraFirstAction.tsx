import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FloraIcon } from "@/components/FloraIcon";
import { Sparkles, ArrowRight, Loader2, AlertTriangle, Flame, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FloraFirstActionProps {
  onStartStudy?: () => void;
}

type Nudge =
  | { kind: "first_plan"; materia: string; razao: string }
  | { kind: "overdue_revisions"; count: number; materia?: string }
  | { kind: "streak_risk"; streak: number }
  | { kind: "weak_subject"; materia: string; accuracy: number; topicId?: string }
  | { kind: "next_topic"; materia: string; tema: string; razao: string };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FloraFirstAction({ onStartStudy }: FloraFirstActionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || dismissed) return;
    // Dismiss persistente por dia (não some ao trocar de aba)
    const dayKey = `flora-nudge-dismissed-${user.id}-${todayKey()}`;
    if (localStorage.getItem(dayKey)) return;

    (async () => {
      setLoading(true);
      try {
        // 1) Onboarding recém-concluído: mostra plano inicial
        const { data: decisions } = await supabase
          .from("flora_decisions")
          .select("recommendation, reasoning, created_at")
          .eq("user_id", user.id)
          .eq("decision_type", "initial_plan")
          .order("created_at", { ascending: false })
          .limit(1);

        const firstPlanKey = `flora-first-plan-shown-${user.id}`;
        if (decisions?.length && !localStorage.getItem(firstPlanKey)) {
          // Só mostra "primeiro plano" se o usuário realmente ainda não engajou.
          // Se já tem sessões de estudo OU revisões concluídas, não é mais o primeiro plano.
          const planCreatedAt = (decisions[0] as { created_at?: string }).created_at;
          const [{ count: sessionsCount }, { count: completedReviewsCount }] = await Promise.all([
            supabase
              .from("study_sessions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id),
            supabase
              .from("spaced_reviews")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("completed", true),
          ]);

          const planAgeHours = planCreatedAt
            ? (Date.now() - new Date(planCreatedAt).getTime()) / 36e5
            : Infinity;
          const isTrulyFirstPlan =
            (sessionsCount ?? 0) === 0 &&
            (completedReviewsCount ?? 0) === 0 &&
            planAgeHours < 48;

          if (isTrulyFirstPlan) {
            const rec = decisions[0].recommendation as Record<string, unknown>;
            if (rec?.slots && Array.isArray(rec.slots) && rec.slots.length > 0) {
              const firstSlot = rec.slots[0] as Record<string, unknown>;
              setNudge({
                kind: "first_plan",
                materia: String(firstSlot.materia || ""),
                razao: String(decisions[0].reasoning || "Seu plano está pronto!"),
              });
              localStorage.setItem(firstPlanKey, "1");
              return;
            }
          } else {
            // Marca como visto pra não checar de novo
            localStorage.setItem(firstPlanKey, "1");
          }
        }

        // 2) Revisões atrasadas (> 0 com scheduled_date < hoje)
        const today = todayKey();
        const { data: overdue } = await supabase
          .from("spaced_reviews")
          .select("materia,scheduled_date")
          .eq("user_id", user.id)
          .eq("completed", false)
          .lt("scheduled_date", today)
          .limit(20);

        if (overdue && overdue.length >= 2) {
          const byMat: Record<string, number> = {};
          for (const r of overdue) byMat[r.materia] = (byMat[r.materia] || 0) + 1;
          const top = Object.entries(byMat).sort((a, b) => b[1] - a[1])[0];
          setNudge({ kind: "overdue_revisions", count: overdue.length, materia: top?.[0] });
          return;
        }

        // 3) Streak em risco: estudou ontem mas não hoje (gamification_profiles.state)
        const { data: gam } = await supabase
          .from("gamification_profiles")
          .select("state")
          .eq("user_id", user.id)
          .maybeSingle();
        const state = (gam?.state ?? {}) as Record<string, unknown>;
        const streak = Number(state.streak ?? 0);
        const lastStudyDate = String(state.lastStudyDate ?? "");
        if (streak >= 3 && lastStudyDate && lastStudyDate !== today) {
          // calculou ontem?
          const y = new Date(); y.setDate(y.getDate() - 1);
          const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
          if (lastStudyDate === yKey) {
            setNudge({ kind: "streak_risk", streak });
            return;
          }
        }

        // 4) Matéria fraca (accuracy < 60%, mín 5 tentativas)
        const { data: perf } = await supabase
          .from("student_performance")
          .select("topic_id,materia,accuracy,acertos,erros,prioridade")
          .eq("user_id", user.id)
          .order("prioridade", { ascending: false })
          .limit(10);
        const fraco = (perf ?? []).find((p) => {
          const total = (p.acertos ?? 0) + (p.erros ?? 0);
          return total >= 5 && Number(p.accuracy) < 0.6;
        });
        if (fraco) {
          setNudge({
            kind: "weak_subject",
            materia: fraco.materia,
            accuracy: Number(fraco.accuracy),
            topicId: fraco.topic_id,
          });
          return;
        }

        // 5) Fallback: próxima recomendação genérica via Flora
        const { data } = await supabase.functions.invoke("flora-engine", {
          body: { action: "decide_next_topic" },
        });
        if (data?.materia) {
          setNudge({
            kind: "next_topic",
            materia: String(data.materia),
            tema: String(data.tema || ""),
            razao: String(data.razao || ""),
          });
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [user, dismissed]);

  if (dismissed || (!loading && !nudge)) return null;

  function dismissForToday() {
    if (user) {
      localStorage.setItem(`flora-nudge-dismissed-${user.id}-${todayKey()}`, "1");
    }
    setDismissed(true);
  }

  function renderContent() {
    if (!nudge) return null;
    switch (nudge.kind) {
      case "first_plan":
        return {
          icon: <Sparkles className="w-4 h-4 text-primary" />,
          title: "Primeira ação recomendada",
          text: nudge.razao,
          cta: `Começar com ${nudge.materia}`,
          onCta: () => { onStartStudy?.(); dismissForToday(); },
        };
      case "overdue_revisions":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          title: "Revisões atrasadas",
          text: `Você tem ${nudge.count} ${nudge.count > 1 ? "revisões" : "revisão"} atrasada${nudge.count > 1 ? "s" : ""}${nudge.materia ? ` (${nudge.materia} é a mais urgente)` : ""}. Coloca em dia em 10 min?`,
          cta: "Revisar agora",
          onCta: () => { onStartStudy?.(); dismissForToday(); },
        };
      case "streak_risk":
        return {
          icon: <Flame className="w-4 h-4 text-orange-500" />,
          title: `Streak de ${nudge.streak} dias em risco`,
          text: `Você não estudou hoje ainda. Mantém a sequência com uma sessão rápida — vale só 1 minuto.`,
          cta: "Estudar 1 minuto",
          onCta: () => { onStartStudy?.(); dismissForToday(); },
        };
      case "weak_subject":
        return {
          icon: <TrendingDown className="w-4 h-4 text-destructive" />,
          title: `${nudge.materia} precisa de atenção`,
          text: `Sua taxa de acerto está em ${Math.round(nudge.accuracy * 100)}%. Que tal 5 questões focadas pra fechar a brecha?`,
          cta: `Praticar ${nudge.materia}`,
          onCta: () => { navigate("/banco"); dismissForToday(); },
        };
      case "next_topic":
        return {
          icon: <Sparkles className="w-4 h-4 text-primary" />,
          title: "Próximo passo",
          text: nudge.razao || `Foca em ${nudge.materia}${nudge.tema ? ` — ${nudge.tema}` : ""}.`,
          cta: `Começar com ${nudge.materia}`,
          onCta: () => { onStartStudy?.(); dismissForToday(); },
        };
    }
  }

  const content = renderContent();

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5 p-4 sm:p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FloraIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Flora analisando seu progresso...
            </div>
          ) : content ? (
            <>
              <div className="flex items-center gap-2">
                {content.icon}
                <span className="text-sm font-semibold">{content.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.text}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="gap-1.5" onClick={content.onCta}>
                  {content.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissForToday}>Depois</Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
