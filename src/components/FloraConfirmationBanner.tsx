import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FloraIcon } from "@/components/FloraIcon";
import { Check, X, AlertTriangle, TrendingUp, TrendingDown, CalendarClock } from "lucide-react";
import { toast } from "sonner";

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
};

export function FloraConfirmationBanner() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingDecision[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("flora_decisions")
      .select("*")
      .eq("user_id", user.id)
      .is("accepted", null)
      .in("decision_type", ["increase_difficulty", "reduce_load", "adjust_plan", "proactive_suggestion"])
      .order("created_at", { ascending: false })
      .limit(3);
    setPending((data as PendingDecision[] | null) ?? []);
  }, [user]);

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
        if (decision) {
          // Execute the accepted recommendation
          try {
            await supabase.functions.invoke("flora-engine", {
              body: { action: "apply_decision", data: { decisionId: id, recommendation: decision.recommendation } },
            });
          } catch { /* non-critical */ }
        }
        toast.success("Sugestão aceita! Flora aplicou a mudança.");
      } else {
        toast("Sugestão rejeitada. Flora vai manter o plano atual.");
      }
      setPending(prev => prev.filter(d => d.id !== id));
    } catch {
      toast.error("Erro ao responder. Tente novamente.");
    } finally {
      setResponding(null);
    }
  };

  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      {pending.map(decision => {
        const meta = DECISION_META[decision.decision_type] || DECISION_META.proactive_suggestion;
        const Icon = meta.icon;
        const rec = decision.recommendation as Record<string, unknown>;
        const isLoading = responding === decision.id;

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
                  <span className="text-sm font-semibold">{meta.label}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {decision.reasoning}
                </p>
                {rec.details && (
                  <p className="text-xs text-muted-foreground/80 italic">
                    {String(rec.details)}
                  </p>
                )}
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
