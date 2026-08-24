import { Button } from "@/components/ui/button";
import type { StudyTopic } from "@/lib/studyData";

interface Props {
  open: boolean;
  onClose: () => void;
  recommendedTopic: StudyTopic | null;
  onChooseRecommended: () => void;
  onChooseFloraResume: () => void;
  onChooseTimerOnly: () => void;
}

export function StudyChoiceDialog({
  open,
  onClose,
  recommendedTopic,
  onChooseRecommended,
  onChooseFloraResume,
  onChooseTimerOnly,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-heading text-lg font-bold">Por onde quer começar?</h2>
          <p className="text-sm text-muted-foreground">Escolha como iniciar sua sessão.</p>
        </div>
        <div className="space-y-2">
          {recommendedTopic && (
            <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={onChooseRecommended}>
              <div className="text-left">
                <p className="font-semibold text-sm">Recomendado pela Flora</p>
                <p className="text-xs text-muted-foreground truncate">{recommendedTopic.tema} · {recommendedTopic.materia}</p>
              </div>
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={onChooseFloraResume}>
            <div className="text-left">
              <p className="font-semibold text-sm">Resumo rápido pela Flora</p>
              <p className="text-xs text-muted-foreground">Conteúdo curto antes de iniciar o timer</p>
            </div>
          </Button>
          <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={onChooseTimerOnly}>
            <div className="text-left">
              <p className="font-semibold text-sm">Só iniciar o cronômetro</p>
              <p className="text-xs text-muted-foreground">Sem matéria fixa — você escolhe enquanto estuda</p>
            </div>
          </Button>
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
