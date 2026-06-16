/**
 * /simulado-semanal — Simulado adaptativo semanal montado pela Flora.
 * 10 questões focadas nos pontos fracos da semana, com cronômetro.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Clock, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

type Questao = {
  enunciado: string;
  alternativas: Record<"A" | "B" | "C" | "D" | "E", string>;
  correta: "A" | "B" | "C" | "D" | "E";
  explicacao: string;
  materia: string;
  tema?: string;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function SimuladoSemanal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("weekly-adaptive-quiz", { body: {} });
        if (error) throw error;
        if (!mounted) return;
        const qs = Array.isArray(data?.questoes) ? (data.questoes as Questao[]) : [];
        if (qs.length === 0) throw new Error("Não consegui gerar o simulado agora.");
        setQuestoes(qs);
        setWeakTopics((data?.weakTopics as string[]) || []);
        startedAt.current = Date.now();
      } catch (e: any) {
        toast.error(e?.message || "Erro ao carregar simulado");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [finished]);

  const q = questoes[current];
  const score = useMemo(() => {
    let hit = 0;
    questoes.forEach((qq, i) => { if (answers[i] && answers[i] === qq.correta) hit++; });
    return hit;
  }, [answers, questoes]);

  const next = () => {
    if (current < questoes.length - 1) setCurrent((c) => c + 1);
    else setFinished(true);
  };

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Simulado da semana
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {weakTopics.length ? `Foco: ${weakTopics.join(", ")}` : "Montado pela Flora"}
            </p>
          </div>
          {!loading && !finished && (
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
              <Clock className="w-4 h-4" /> {formatTime(elapsed)}
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-3 sm:px-4 py-6">
        {loading && (
          <div className="text-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Flora está montando seu simulado...</p>
          </div>
        )}

        {!loading && !finished && q && (
          <article className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                Questão {current + 1} de {questoes.length}
              </span>
              <span className="text-primary font-semibold">{q.materia}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.enunciado}</p>
            <div className="space-y-2">
              {(["A","B","C","D","E"] as const).map((letra) => {
                const chosen = answers[current];
                const isChosen = chosen === letra;
                const showResult = !!chosen;
                const isCorrect = letra === q.correta;
                return (
                  <button
                    key={letra}
                    disabled={!!chosen}
                    onClick={() => setAnswers((a) => ({ ...a, [current]: letra }))}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors flex gap-3 items-start ${
                      showResult
                        ? isCorrect
                          ? "border-green-500/60 bg-green-500/10"
                          : isChosen
                            ? "border-destructive/60 bg-destructive/10"
                            : "border-border bg-card opacity-70"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-bold w-5">{letra}</span>
                    <span className="flex-1">{q.alternativas[letra]}</span>
                    {showResult && isCorrect && <Check className="w-4 h-4 text-green-600" />}
                    {showResult && isChosen && !isCorrect && <X className="w-4 h-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {answers[current] && (
              <div className="rounded-xl bg-muted/40 border border-border p-3 text-sm">
                <p className="font-semibold mb-1">Por quê?</p>
                <p className="text-muted-foreground leading-relaxed">{q.explicacao}</p>
              </div>
            )}
            <Button className="w-full" disabled={!answers[current]} onClick={next}>
              {current === questoes.length - 1 ? "Finalizar" : "Próxima"}
            </Button>
          </article>
        )}

        {!loading && finished && (
          <article className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Simulado concluído!</h2>
            <p className="text-muted-foreground">
              Você acertou <span className="font-bold text-foreground">{score} de {questoes.length}</span> em {formatTime(elapsed)}.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate("/analise")}>Ver análise</Button>
              <Button onClick={() => navigate("/")}>Voltar ao início</Button>
            </div>
          </article>
        )}
      </main>
      <BottomNav />
    </div>
  );
}