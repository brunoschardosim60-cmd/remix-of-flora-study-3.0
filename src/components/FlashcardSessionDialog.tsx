import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { applySM2, getDueFlashcards, type ReviewQuality } from "@/lib/flashcardScheduler";
import type { Flashcard, StudyTopic } from "@/lib/studyData";
import { MathText } from "@/components/MathText";

interface FlashcardSessionDialogProps {
  open: boolean;
  topics: StudyTopic[];
  onClose: () => void;
  onUpdateFlashcards: (topicId: string, flashcards: Flashcard[]) => void;
}

export function FlashcardSessionDialog({ open, topics, onClose, onUpdateFlashcards }: FlashcardSessionDialogProps) {
  // Snapshot da fila quando o dialog abre — não recalcula durante a sessão
  const queue = useMemo(() => (open ? getDueFlashcards(topics) : []), [open, topics]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, hard: 0, wrong: 0 });

  const total = queue.length;
  const current = queue[idx];
  const finished = idx >= total;

  const reset = () => { setIdx(0); setRevealed(false); setStats({ correct: 0, hard: 0, wrong: 0 }); };

  const handleAnswer = (quality: ReviewQuality) => {
    if (!current) return;
    const updated = applySM2(current.card, quality);
    const topic = topics.find((t) => t.id === current.topicId);
    if (topic) {
      const nextFlashcards = topic.flashcards.map((f) => (f.id === updated.id ? updated : f));
      onUpdateFlashcards(current.topicId, nextFlashcards);
    }
    setStats((s) => ({
      correct: s.correct + (quality >= 4 ? 1 : 0),
      hard: s.hard + (quality === 3 ? 1 : 0),
      wrong: s.wrong + (quality === 0 ? 1 : 0),
    }));
    setIdx((i) => i + 1);
    setRevealed(false);
  };

  const handleClose = () => { onClose(); reset(); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90dvh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 pt-5 pb-3 space-y-2">
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Revisão de flashcards
          </DialogTitle>
          <DialogDescription className="text-xs">
            {total === 0
              ? "Sem cards pendentes hoje. Volte amanhã!"
              : finished
                ? `Sessão concluída · ${stats.correct} acertou, ${stats.hard} difícil, ${stats.wrong} errou`
                : `Card ${idx + 1} de ${total} · ${current?.topicMateria} — ${current?.topicTema}`}
          </DialogDescription>
          {total > 0 && !finished && <Progress value={((idx) / total) * 100} className="h-1.5" />}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {total === 0 && (
            <div className="text-center py-10 space-y-3">
              <Brain className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Você está em dia com suas revisões. 🎉
              </p>
              <p className="text-xs text-muted-foreground">
                Crie flashcards nos seus tópicos ou faça quizzes — os erros viram cards automáticos.
              </p>
            </div>
          )}

          {current && !finished && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 min-h-[140px]">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/70 mb-2">Pergunta</p>
                <MathText className="text-base font-medium break-words whitespace-pre-wrap">{current.card.frente}</MathText>
              </div>

              {revealed && (
                <div className="rounded-lg border-2 border-secondary/30 bg-secondary/5 p-4 min-h-[100px]">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-secondary/80 mb-2">Resposta</p>
                  <MathText className="text-sm break-words whitespace-pre-wrap">{current.card.verso}</MathText>
                </div>
              )}

              {!revealed && (
                <Button onClick={() => setRevealed(true)} className="w-full" size="lg">
                  Ver resposta
                </Button>
              )}
            </div>
          )}

          {finished && total > 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full mx-auto bg-secondary/15 text-secondary flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <p className="font-heading font-semibold text-lg">Sessão concluída!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.correct} acertou · {stats.hard} difícil · {stats.wrong} errou
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Os cards errados ou difíceis voltam em breve. Os fáceis foram adiados pelo algoritmo.
              </p>
            </div>
          )}
        </div>

        {(revealed && current && !finished) || finished ? (
          <div className="sticky bottom-0 bg-background border-t px-6 py-3 flex gap-2 flex-wrap justify-end">
            {revealed && current && !finished && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleAnswer(0)}>
                  <XCircle className="w-3.5 h-3.5" /> Errei
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAnswer(3)}>
                  Difícil
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAnswer(4)}>
                  Ok
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => handleAnswer(5)}>
                  <Sparkles className="w-3.5 h-3.5" /> Fácil
                </Button>
              </>
            )}
            {finished && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
                  <RotateCcw className="w-3.5 h-3.5" /> Refazer
                </Button>
                <Button size="sm" onClick={handleClose}>Fechar</Button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}