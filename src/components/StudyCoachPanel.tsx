import { useEffect, useState } from "react";
import { StudyTopic } from "@/lib/studyData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, NotebookPen, PlayCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DISMISS_STORAGE_KEY = "studyflow:coach-dismissed";
// Bucket por hora — sugestões dismissadas voltam a aparecer 1h depois.
function bucketKey(): string { return new Date().toISOString().slice(0, 13); }

interface StudyCoachPanelProps {
  weakTopics: StudyTopic[];
  missingNotesTopics: StudyTopic[];
  missingFlashcardsTopics: StudyTopic[];
  onStartStudy: (topic: StudyTopic) => void;
  onOpenNotes: (topic: StudyTopic) => void;
  onOpenQuiz: (topic: StudyTopic) => void;
}

type DismissKey = `${"weak" | "notes" | "flashcards"}:${string}`;

export function StudyCoachPanel({
  weakTopics,
  missingNotesTopics,
  missingFlashcardsTopics,
  onStartStudy,
  onOpenNotes,
  onOpenQuiz,
}: StudyCoachPanelProps) {
  const { user } = useAuth();
  // Dismissals persistem por dia — não voltam toda vez que o aluno recarrega.
  const storageKey = `${DISMISS_STORAGE_KEY}:${user?.id || "anon"}:${bucketKey()}`;
  const [dismissed, setDismissed] = useState<Set<DismissKey>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as DismissKey[]);
    } catch { return new Set(); }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(dismissed)));
      // limpa chaves de buckets anteriores (horas passadas)
      const prefix = `${DISMISS_STORAGE_KEY}:${user?.id || "anon"}:`;
      const current = bucketKey();
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix) && !k.endsWith(current)) window.localStorage.removeItem(k);
      }
    } catch { /* silent */ }
  }, [dismissed, storageKey, user?.id]);

  const dismiss = (key: DismissKey) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const topWeak = weakTopics.filter((t) => !dismissed.has(`weak:${t.id}`)).slice(0, 3);
  const topNotes = missingNotesTopics.filter((t) => !dismissed.has(`notes:${t.id}`)).slice(0, 2);
  const topFlashcards = missingFlashcardsTopics.filter((t) => !dismissed.has(`flashcards:${t.id}`)).slice(0, 2);
  const visibleSections = [
    topWeak.length > 0 ? "weak" : null,
    topNotes.length > 0 ? "notes" : null,
    topFlashcards.length > 0 ? "flashcards" : null,
  ].filter(Boolean);

  if (visibleSections.length === 0) {
    return (
      <section className="rounded-[24px] border border-border/70 bg-card/85 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Próximas melhores ações</h3>
        </div>
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-6 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-medium">Tudo em dia!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sem temas frágeis, sem notas faltando, sem flashcards pendentes. Continue firme.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-border/70 bg-card/85 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Próximas melhores ações</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pequenos empurrões baseados no que está faltando ou ficou mais frágil.
      </p>

      <div className={`mt-4 grid gap-4 ${visibleSections.length >= 3 ? "xl:grid-cols-3" : visibleSections.length === 2 ? "xl:grid-cols-2" : ""}`}>
        {topWeak.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              <p className="font-medium">Temas mais frágeis</p>
            </div>
            <div className="mt-3 space-y-3">
              {topWeak.map((topic) => (
                <div key={topic.id} className="rounded-xl border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{topic.tema}</p>
                    <Badge variant="outline">{topic.rating || 0}/5</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topic.quizErrors?.length ?? 0} erro{(topic.quizErrors?.length ?? 0) === 1 ? "" : "s"} recentes no quiz
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { dismiss(`weak:${topic.id}`); onOpenQuiz(topic); }}>Treinar</Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-background/80" onClick={() => { dismiss(`weak:${topic.id}`); onStartStudy(topic); }}>Estudar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {topNotes.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-primary" />
              <p className="font-medium">Temas sem notas</p>
            </div>
            <div className="mt-3 space-y-3">
              {topNotes.map((topic) => (
                <div key={topic.id} className="rounded-xl border border-border/50 p-3">
                  <p className="truncate text-sm font-medium">{topic.tema}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Adicione contexto para a IA gerar melhor.</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full bg-background/80" onClick={() => { dismiss(`notes:${topic.id}`); onOpenNotes(topic); }}>
                    Abrir anotações
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {topFlashcards.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-secondary" />
              <p className="font-medium">Temas sem flashcards</p>
            </div>
            <div className="mt-3 space-y-3">
              {topFlashcards.map((topic) => (
                <div key={topic.id} className="rounded-xl border border-border/50 p-3">
                  <p className="truncate text-sm font-medium">{topic.tema}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bom candidato para consolidar retenção rápida.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-background/80" onClick={() => { dismiss(`flashcards:${topic.id}`); onOpenNotes(topic); }}>
                      Gerar cards
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => { dismiss(`flashcards:${topic.id}`); onStartStudy(topic); }}>
                      Revisar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
