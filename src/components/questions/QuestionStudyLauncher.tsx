import { Brain, Play, SlidersHorizontal, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface QuestionStudyLauncherProps {
  totalQuestions: number;
  answeredCount: number;
  errorCount: number;
  onContinue: () => void;
  onReviewErrors: () => void;
  onCustomize: () => void;
  onSimulate: () => void;
}

export function QuestionStudyLauncher({
  totalQuestions,
  answeredCount,
  errorCount,
  onContinue,
  onReviewErrors,
  onCustomize,
  onSimulate,
}: QuestionStudyLauncherProps) {
  const remaining = Math.max(0, totalQuestions - answeredCount);

  return (
    <section aria-labelledby="study-launcher-title" className="space-y-3">
      <div>
        <h2 id="study-launcher-title" className="font-heading text-lg font-semibold">Como você quer praticar?</h2>
        <p className="text-sm text-muted-foreground">Escolha um caminho e comece sem configurar tudo de novo.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="flex flex-col border-primary/25 bg-primary/[0.04] p-4">
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Play className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">Continuar questões</h3>
          <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">
            {remaining > 0 ? `${remaining} questões ainda não respondidas nos filtros atuais.` : "Você concluiu as questões destes filtros."}
          </p>
          <Button onClick={onContinue} disabled={totalQuestions === 0} className="w-full gap-2">
            <Play className="h-4 w-4" /> Continuar
          </Button>
        </Card>

        <Card className="flex flex-col p-4">
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Brain className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">Caderno de erros</h3>
          <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">
            {errorCount > 0 ? `${errorCount} questões erradas prontas para uma nova tentativa.` : "Seus erros aparecerão aqui para revisão."}
          </p>
          <Button variant="outline" onClick={onReviewErrors} disabled={errorCount === 0} className="w-full gap-2">
            <Brain className="h-4 w-4" /> Abrir revisão
          </Button>
        </Card>

        <Card className="flex flex-col p-4">
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">Montar uma sessão</h3>
          <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">Escolha matéria, tema, ano e quantidade de questões.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onCustomize} className="gap-1.5 px-2">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </Button>
            <Button variant="outline" onClick={onSimulate} className="gap-1.5 px-2">
              <Timer className="h-4 w-4" /> Simulado
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
