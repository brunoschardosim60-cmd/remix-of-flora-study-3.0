import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { floraGenerateQuiz } from "@/lib/floraClient";
import { toast } from "sonner";

interface Perf {
  materia: string;
  accuracy: number;
  acertos: number;
  erros: number;
  erro_recorrente: boolean;
  prioridade: number;
}

interface Topic {
  id: string;
  tema: string;
  materia: string;
  quizErrors?: unknown[];
  quizLastScore?: number | null;
  rating?: number;
}

interface Props {
  perfs: Perf[];
  topics: Topic[];
}

/**
 * Pontos fracos detectados pela Flora.
 * Combina student_performance (top 5 por prioridade/erros)
 * com fallback em study_topics (quiz_errors, quiz_last_score baixo).
 */
export function WeakSpotsCard({ perfs, topics }: Props) {
  const navigate = useNavigate();
  const [loadingTema, setLoadingTema] = useState<string | null>(null);

  const items = useMemo(() => {
    const fromPerf = perfs
      .filter(p => p.accuracy < 70 || p.erro_recorrente)
      .map(p => ({
        key: `perf:${p.materia}`,
        materia: p.materia,
        tema: "" as string,
        label: p.materia,
        sub: `Acerto ${Math.round(p.accuracy)}% · ${p.erros} erros`,
        score: 100 - p.accuracy + (p.erro_recorrente ? 30 : 0) + p.prioridade * 5,
      }));

    const fromTopics = topics
      .map(t => {
        const errs = (t.quizErrors as unknown[] | undefined)?.length || 0;
        const score = t.quizLastScore ?? null;
        const rating = t.rating ?? 0;
        let weight = 0;
        if (errs >= 2) weight += 30 + errs * 5;
        if (score !== null && score < 60) weight += (60 - score);
        if (rating > 0 && rating <= 2) weight += 20;
        return { t, weight, errs, score };
      })
      .filter(x => x.weight > 0)
      .map(x => ({
        key: `topic:${x.t.id}`,
        materia: x.t.materia,
        tema: x.t.tema,
        label: `${x.t.tema}`,
        sub: `${x.t.materia} · ${x.errs > 0 ? `${x.errs} erros` : ""}${x.score !== null ? ` · ${x.score}% último quiz` : ""}`,
        score: x.weight,
      }));

    const all = [...fromTopics, ...fromPerf]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return all;
  }, [perfs, topics]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/70 p-6 text-center">
        <Brain className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nada crítico detectado por enquanto. 🌱</p>
      </div>
    );
  }

  const reforcar = async (materia: string, tema: string) => {
    if (!tema) {
      toast.info("Abra um tópico específico para gerar o quiz de reforço.");
      return;
    }
    setLoadingTema(`${materia}|${tema}`);
    try {
      const res = await floraGenerateQuiz(materia, tema, "medio", { mode: "review_errors" });
      if (res) {
        toast.success("Quiz de reforço pronto!");
        navigate(`/?openQuiz=${encodeURIComponent(tema)}&materia=${encodeURIComponent(materia)}`);
      }
    } catch {
      toast.error("Erro ao gerar quiz");
    } finally {
      setLoadingTema(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h2 className="font-heading text-base font-semibold">Pontos fracos da Flora</h2>
      </div>
      <div className="space-y-2">
        {items.map(it => {
          const loading = loadingTema === `${it.materia}|${it.tema}`;
          return (
            <div key={it.key} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.label}</p>
                <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {it.tema && (
                  <Button size="sm" variant="outline" onClick={() => reforcar(it.materia, it.tema)} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                    <span className="ml-1">Reforço</span>
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate("/aulao")}>
                  <BookOpen className="h-3 w-3" />
                  <span className="ml-1">Estudar</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}