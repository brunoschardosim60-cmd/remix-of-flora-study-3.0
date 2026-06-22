import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, CheckCircle2, PlayCircle, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DISMISSED_KEY_BASE = "quickstart-dismissed";
const FLORA_TALKED_KEY_BASE = "quickstart-flora-talked";
const keyFor = (base: string, userId?: string | null) =>
  userId ? `${base}:${userId}` : base;

interface QuickStartChecklistProps {
  isLoggedIn: boolean;
  topicCount: number;
  sessionCount: number;
  hasStartedStudySession: boolean;
  onCreateTopic: () => void;
  onStartStudy: () => void;
}

export function QuickStartChecklist({
  isLoggedIn,
  topicCount,
  sessionCount,
  hasStartedStudySession,
  onCreateTopic,
  onStartStudy,
}: QuickStartChecklistProps) {
  const { user } = useAuth();
  const dismissedKey = keyFor(DISMISSED_KEY_BASE, user?.id);
  const floraTalkedKey = keyFor(FLORA_TALKED_KEY_BASE, user?.id);
  const [dismissed, setDismissed] = useState(false);
  const [talkedToFlora, setTalkedToFlora] = useState(false);

  // Re-hidrata o estado quando o usuário muda (login/logout), respeitando
  // também a chave global antiga pra não reaparecer pra quem já tinha visto.
  useEffect(() => {
    try {
      const d = localStorage.getItem(dismissedKey) === "true"
        || localStorage.getItem(DISMISSED_KEY_BASE) === "true";
      const f = localStorage.getItem(floraTalkedKey) === "true"
        || localStorage.getItem(FLORA_TALKED_KEY_BASE) === "true";
      setDismissed(d);
      setTalkedToFlora(f);
    } catch { /* ignore */ }
  }, [dismissedKey, floraTalkedKey]);

  useEffect(() => {
    const onOpen = () => {
      try { localStorage.setItem(floraTalkedKey, "true"); } catch {}
      setTalkedToFlora(true);
    };
    window.addEventListener("open-flora-chat", onOpen);
    return () => window.removeEventListener("open-flora-chat", onOpen);
  }, [floraTalkedKey]);

  const steps = [
    {
      id: "topic",
      title: "Criar primeiro tema",
      done: topicCount > 0,
      icon: BookOpen,
      action: onCreateTopic,
      actionLabel: "Criar tema",
      helper: "Isso monta seu cronograma de revisao.",
    },
    {
      id: "study",
      title: "Fazer a primeira sessao",
      done: topicCount === 0 ? false : sessionCount > 0 || hasStartedStudySession,
      icon: PlayCircle,
      action: onStartStudy,
      actionLabel: "Estudar agora",
      helper: "Uma sessao ja comeca a alimentar foco e metricas.",
    },
    {
      id: "flora",
      title: "Conversar com a Flora",
      done: talkedToFlora,
      icon: Sparkles,
      action: () => {
        try { localStorage.setItem(floraTalkedKey, "true"); } catch {}
        setTalkedToFlora(true);
        window.dispatchEvent(new CustomEvent("open-flora-chat"));
      },
      actionLabel: "Falar com a Flora",
      helper: "Pe\u00e7a um plano, tire d\u00favida ou pe\u00e7a uma aula. Ela te conhece.",
    },
  ];

  const completedSteps = steps.filter((s) => s.done).length;
  const allDone = completedSteps === steps.length;

  // Auto-dismiss assim que todos os passos forem concluídos (sem ruído visual permanente)
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => handleDismiss(), 1500);
    return () => clearTimeout(t);
  }, [allDone]);

  if (dismissed || allDone) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(dismissedKey, "true"); } catch {}
  }

  return (
    <section className="rounded-[24px] border border-border/70 bg-card/85 p-4 sm:p-5 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label="Dispensar checklist"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pr-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Primeiros passos</h3>
            <Badge variant="outline">{completedSteps}/{steps.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {allDone
              ? "Tudo pronto! Agora o app vai funcionar com todo o potencial."
              : isLoggedIn
                ? "Feche esse circuito uma vez e o resto do app comeca a fazer mais sentido."
                : "Voce ja pode comecar localmente e sincronizar depois quando entrar."}
          </p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${steps.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-2xl border p-4 transition-colors ${
                step.done
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-background/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${step.done ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>{step.title}</p>
                </div>
                <CheckCircle2 className={`h-4 w-4 ${step.done ? "text-primary" : "text-muted-foreground/30"}`} />
              </div>
              {!step.done && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">{step.helper}</p>
                  <Button variant="default" size="sm" className="mt-4 w-full" onClick={step.action}>
                    {step.actionLabel}
                  </Button>
                </>
              )}
              {step.done && (
                <p className="mt-2 text-sm text-primary/70 flex items-center gap-1">Concluido ✓</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
