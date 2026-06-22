import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FloraIcon } from "@/components/FloraIcon";
import { Check, X, AlertTriangle, TrendingUp, TrendingDown, CalendarClock, ArrowRight, Sparkles, Coffee, Activity, MoonStar } from "lucide-react";
import { toast } from "sonner";
import { useStudentObjetivo } from "@/hooks/useStudentObjetivo";

interface PendingDecision {
  id: string;
  decision_type: string;
  reasoning: string;
  recommendation: Record<string, unknown>;
  created_at: string;
}

const DECISION_META: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  increase_difficulty: { icon: TrendingUp, label: "Aumentar dificuldade", color: "text-amber-500" },
  reduce_load: { icon: TrendingDown, label: "Reduzir carga", color: "text-blue-500" },
  adjust_plan: { icon: CalendarClock, label: "Ajustar plano", color: "text-violet-500" },
  proactive_suggestion: { icon: AlertTriangle, label: "Sugestão da Flora", color: "text-primary" },
  risk_alert: { icon: AlertTriangle, label: "Alerta da Flora", color: "text-rose-500" },
};

// Sub-label específico por subtype de risk_alert
const RISK_SUBTYPE_META: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  abandono:       { icon: Coffee,    label: "Faz tempo que não estuda", color: "text-rose-500" },
  queda_acertos:  { icon: TrendingDown, label: "Queda de acertos",       color: "text-amber-500" },
  excesso_tempo:  { icon: MoonStar,  label: "Excesso de tempo",          color: "text-violet-500" },
};

// Tenta extrair a primeira matéria mencionada no texto da sugestão
function detectMateria(text: string): string | null {
  const materias = [
    "Matemática","Português","Redação","Física","Química","Biologia","História","Geografia","Filosofia","Sociologia","Inglês","Espanhol","Literatura","Artes",
    "Direito Constitucional","Direito Administrativo","Direito Penal","Direito Civil","Raciocínio Lógico","Informática","Atualidades","Contabilidade","Administração Pública",
  ];
  const found = materias.find((m) => new RegExp(`\\b${m}\\b`, "i").test(text));
  return found ?? null;
}

interface NextStep {
  label: string;
  route: string;
  primary?: boolean;
}

function nextStepsFor(decision: PendingDecision, bancoRoute: string): NextStep[] {
  const text = `${decision.reasoning} ${JSON.stringify(decision.recommendation || {})}`;
  const materia = detectMateria(text);
  switch (decision.decision_type) {
    case "reduce_load":
      return [
        { label: "Ver revisões pendentes", route: "/", primary: true },
        { label: "Abrir cronograma", route: "/" },
      ];
    case "increase_difficulty":
      return [
        { label: "Fazer quiz mais difícil", route: bancoRoute, primary: true },
        { label: "Ver desempenho", route: "/analise" },
      ];
    case "adjust_plan":
      return [
        { label: "Abrir cronograma", route: "/", primary: true },
      ];
    case "risk_alert": {
      const subtype = (decision.recommendation as any)?.subtype;
      if (subtype === "abandono") {
        return [
          { label: "Estudar 15 min agora", route: "/?flora=1", primary: true },
          { label: "Ver cronograma", route: "/" },
        ];
      }
      if (subtype === "queda_acertos") {
        return [
          { label: "Revisar pontos fracos", route: "/analise", primary: true },
          { label: "Refazer quiz", route: bancoRoute },
        ];
      }
      if (subtype === "excesso_tempo") {
        return [
          { label: "Fazer uma pausa", route: "/", primary: true },
        ];
      }
      return [{ label: "Falar com a Flora", route: "/?flora=1", primary: true }];
    }
    case "proactive_suggestion":
    default: {
      const subtype = (decision.recommendation as any)?.subtype;
      if (subtype === "errors_pattern") {
        return [
          { label: "Quero a aula + 3 exercícios", route: bancoRoute, primary: true },
          { label: "Mais tarde", route: "/" },
        ];
      }
      if (subtype === "inactivity") {
        return [
          { label: "Estudar 10 min agora", route: "/?flora=1", primary: true },
        ];
      }
      if (subtype === "night_quiz") {
        return [
          { label: "Fazer 5 questões", route: bancoRoute, primary: true },
        ];
      }
      return [
        materia
          ? { label: `Estudar ${materia} agora`, route: bancoRoute, primary: true }
          : { label: "Começar agora", route: "/", primary: true },
        { label: "Falar com a Flora", route: "/?flora=1" },
      ];
    }
  }
}

export function FloraConfirmationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bancoRoute, isConcurso } = useStudentObjetivo(user);
  const [pending, setPending] = useState<PendingDecision[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [acceptedInfo, setAcceptedInfo] = useState<Record<string, { summary: string; steps: NextStep[]; meta: typeof DECISION_META[string] }>>({});

  // Limite: 1 sugestão por dia por usuário (por dispositivo).
  // Quando o aluno aceita ou clica em "Manter atual", marcamos o dia como visto
  // e o banner só volta a aparecer no dia seguinte.
  const dailyKey = user ? `flora-suggestion-day:${user.id}` : null;
  const today = new Date().toISOString().slice(0, 10);
  const seenToday = (() => {
    if (!dailyKey) return false;
    try { return localStorage.getItem(dailyKey) === today; } catch { return false; }
  })();
  const markSeenToday = useCallback(() => {
    if (!dailyKey) return;
    try { localStorage.setItem(dailyKey, today); } catch { /* ignore */ }
  }, [dailyKey, today]);

  const loadPending = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("flora_decisions")
      .select("*")
      .eq("user_id", user.id)
      .is("accepted", null)
      .in("decision_type", ["increase_difficulty", "reduce_load", "adjust_plan", "proactive_suggestion", "risk_alert"])
      .order("created_at", { ascending: false })
      .limit(3);
    let rows = (data as PendingDecision[] | null) ?? [];
    // Se o aluno é ENEM, descarta sugestões com matérias de concurso
    if (!isConcurso) {
      const concursoOnly = /\b(Direito (Constitucional|Administrativo|Penal|Civil)|Raciocínio Lógico|Informática para concursos?|Contabilidade|Administração Pública)\b/i;
      rows = rows.filter((d) => {
        const txt = `${d.reasoning} ${JSON.stringify(d.recommendation || {})}`;
        return !concursoOnly.test(txt);
      });
    }
    // Apenas 1 sugestão por dia
    setPending(rows.slice(0, 1));
  }, [user, isConcurso]);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Also trigger after Flora analyze
  useEffect(() => {
    if (!user) return;
    const handler = () => loadPending();
    window.addEventListener("flora-decisions-updated", handler);
    return () => window.removeEventListener("flora-decisions-updated", handler);
  }, [user, loadPending]);

  const respond = async (id: string, accepted: boolean) => {
    setResponding(id);
    try {
      const { error } = await supabase
        .from("flora_decisions")
        .update({ accepted })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;

      if (accepted) {
        const decision = pending.find(d => d.id === id);
        let summary = "Flora aplicou a mudança.";
        if (decision) {
          try {
            const { data: resp } = await supabase.functions.invoke("flora-engine", {
              body: { action: "apply_decision", data: { decisionId: id, recommendation: decision.recommendation } },
            });
            if (resp?.summary) summary = resp.summary as string;
          } catch { /* non-critical */ }
          const meta = DECISION_META[decision.decision_type] || DECISION_META.proactive_suggestion;
          setAcceptedInfo((prev) => ({ ...prev, [id]: { summary, steps: nextStepsFor(decision, bancoRoute), meta } }));
          markSeenToday();
          // Mantém o card visível mostrando o estado "feito"; removerá depois
          setTimeout(() => {
            setAcceptedInfo((prev) => { const n = { ...prev }; delete n[id]; return n; });
            setPending(prev => prev.filter(d => d.id !== id));
          }, 8000);
          toast.success("Sugestão aceita!");
          return;
        }
      } else {
        toast("Sugestão rejeitada. Flora vai manter o plano atual.");
        markSeenToday();
      }
      setPending(prev => prev.filter(d => d.id !== id));
    } catch {
      toast.error("Erro ao responder. Tente novamente.");
    } finally {
      setResponding(null);
    }
  };

  if (seenToday || pending.length === 0) return null;

  return (
    <div className="space-y-3">
      {pending.map(decision => {
        const baseMeta = DECISION_META[decision.decision_type] || DECISION_META.proactive_suggestion;
        const subtype = (decision.recommendation as any)?.subtype;
        const meta =
          decision.decision_type === "risk_alert" && subtype && RISK_SUBTYPE_META[subtype]
            ? RISK_SUBTYPE_META[subtype]
            : baseMeta;
        const Icon = meta.icon;
        const rec = decision.recommendation as Record<string, unknown>;
        const isLoading = responding === decision.id;
        const accepted = acceptedInfo[decision.id];
        const steps = nextStepsFor(decision, bancoRoute);

        return (
          <div
            key={decision.id}
            className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FloraIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                  <span className="text-sm font-semibold">{accepted ? "Feito pela Flora" : meta.label}</span>
                </div>
                {accepted ? (
                  <>
                    <p className="text-sm text-foreground leading-relaxed flex items-start gap-1.5">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{accepted.summary}</span>
                    </p>
                    <div className="pt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Primeiros passos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {accepted.steps.map((s, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant={s.primary ? "default" : "outline"}
                            className="gap-1.5"
                            onClick={() => navigate(s.route)}
                          >
                            {s.label}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {decision.reasoning}
                    </p>
                    {rec.changes && typeof (rec.changes as any).description === "string" && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">O que a Flora vai fazer</p>
                        <p className="text-xs text-foreground leading-relaxed">{(rec.changes as any).description}</p>
                      </div>
                    )}
                    {/* Preview dos primeiros passos para deixar claro o que acontece ao aceitar */}
                    <div className="pt-0.5">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Primeiros passos sugeridos
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {steps.map((s, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => respond(decision.id, true)}
                        disabled={isLoading}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => respond(decision.id, false)}
                        disabled={isLoading}
                      >
                        <X className="w-3.5 h-3.5" />
                        Manter atual
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
