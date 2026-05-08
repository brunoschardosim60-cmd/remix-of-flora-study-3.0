import { useEffect, useState } from "react";
import { Sparkles, Brain, Lightbulb, BookOpen, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: Brain, label: "Analisando seu histórico de estudo..." },
  { icon: BookOpen, label: "Estruturando os blocos da aula..." },
  { icon: Lightbulb, label: "Buscando analogias e exemplos..." },
  { icon: Sparkles, label: "Adaptando ao seu nível..." },
  { icon: CheckCircle2, label: "Quase lá, ajustando os detalhes..." },
];

export function FloraThinkingLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      {/* Orbe pulsante da Flora */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2.5s" }} />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <Sparkles className="w-10 h-10 text-primary-foreground animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">Flora está preparando sua aula</h2>
      <p className="text-sm text-muted-foreground mb-8">Aulas personalizadas demoram alguns segundos</p>

      {/* Etapas */}
      <div className="w-full max-w-md space-y-2">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const Icon = s.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-500 ${
                active
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : done
                  ? "border-border/50 bg-muted/30 opacity-60"
                  : "border-border/30 opacity-30"
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  active ? "bg-primary text-primary-foreground" : done ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className={`w-4 h-4 ${active ? "animate-pulse" : ""}`} />}
              </div>
              <span className={`text-sm ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {active && (
                <div className="ml-auto flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
