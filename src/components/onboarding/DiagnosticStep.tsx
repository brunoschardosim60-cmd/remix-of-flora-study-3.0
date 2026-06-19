import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const AREAS = [
  { key: "linguagens", label: "Linguagens" },
  { key: "matematica", label: "Matemática" },
  { key: "humanas",    label: "Ciências Humanas" },
  { key: "natureza",   label: "Ciências da Natureza" },
];

type DQ = {
  id: string;
  area: string;
  materia: string;
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
  correta: string;
};

interface Props {
  onComplete: (answers: Array<{ area: string; materia: string; correct: boolean }>) => void;
  onSkip: () => void;
}

export function DiagnosticStep({ onComplete, onSkip }: Props) {
  const [questions, setQuestions] = useState<DQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ area: string; materia: string; correct: boolean }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const collected: DQ[] = [];
        for (const a of AREAS) {
          const { data } = await supabase
            .from("questions")
            .select("id,area,materia,enunciado,alternativas,resposta_correta")
            .eq("area", a.key)
            .eq("origem", "enem.dev")
            .limit(50);
          const pool = (data || []) as any[];
          // shuffle e pega 2
          const picks = pool.sort(() => Math.random() - 0.5).slice(0, 2);
          for (const q of picks) {
            const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
            const normAlts = alts.map((x: any) => ({
              letra: x.letra || x.letter || "",
              texto: x.texto || x.text || "",
            })).filter((x: any) => x.letra && x.texto);
            if (normAlts.length >= 4 && q.resposta_correta) {
              collected.push({
                id: q.id,
                area: q.area,
                materia: q.materia || a.label,
                enunciado: q.enunciado || "",
                alternativas: normAlts,
                correta: q.resposta_correta,
              });
            }
          }
        }
        setQuestions(collected);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="w-full text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Carregando seu diagnóstico...</p>
      </div>
    );
  }

  if (questions.length < 2) {
    // sem questões suficientes — pula
    return (
      <div className="w-full space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Sem questões suficientes pra diagnóstico agora.</p>
        <Button onClick={onSkip}>Continuar <ArrowRight className="w-4 h-4 ml-1" /></Button>
      </div>
    );
  }

  const q = questions[idx];
  const total = questions.length;
  const progress = ((idx) / total) * 100;

  const handleAnswer = (letra: string) => {
    if (chosen) return;
    setChosen(letra);
    const correct = letra === q.correta;
    const newAnswers = [...answers, { area: q.area, materia: q.materia, correct }];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (idx + 1 >= total) {
        onComplete(newAnswers);
      } else {
        setIdx(idx + 1);
        setChosen(null);
      }
    }, 900);
  };

  return (
    <motion.div
      key={`diag-${idx}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="w-full space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-purple-500" />
        </div>
        <h1 className="text-xl font-bold">Diagnóstico rápido</h1>
        <p className="text-xs text-muted-foreground">{idx + 1} de {total} · {q.materia}</p>
      </div>

      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{q.enunciado}</p>
      </div>

      <div className="space-y-2">
        {q.alternativas.map((alt) => {
          const isChosen = chosen === alt.letra;
          const isCorrect = chosen && alt.letra === q.correta;
          const isWrong = isChosen && alt.letra !== q.correta;
          return (
            <button
              key={alt.letra}
              onClick={() => handleAnswer(alt.letra)}
              disabled={!!chosen}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left text-sm transition-all ${
                isCorrect ? "border-green-500 bg-green-500/10"
                : isWrong ? "border-red-500 bg-red-500/10"
                : isChosen ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
              } ${chosen ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="font-bold shrink-0">{alt.letra}</span>
              <span className="flex-1">{alt.texto}</span>
              {isCorrect && <Check className="w-4 h-4 text-green-600 shrink-0" />}
              {isWrong && <X className="w-4 h-4 text-red-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
      >
        Pular diagnóstico
      </button>
    </motion.div>
  );
}
