/**
 * /simulado-enem — Modo prova ENEM: questões reais do banco, timer fixo, sem Flora.
 * Ao fim, gera relatório com pontuação por área usando predictENEM (toENEMScale).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Play, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { toENEMScale } from "@/lib/predictENEM";
import { toast } from "sonner";

type DbQuestao = {
  id: string;
  enunciado: string;
  alternativas: Record<string, string> | unknown;
  correta: string;
  area: string;
  disciplina: string;
  ano: number | null;
};

const DURATION_SECONDS = 5 * 60 * 60 + 30 * 60; // 5h30
const QUESTIONS_TARGET = 45; // versão enxuta — 90+ pesaria muito o cliente

function format(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function SimuladoEnem() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questoes, setQuestoes] = useState<DbQuestao[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(DURATION_SECONDS);
  const [finished, setFinished] = useState(false);
  const [onlyOfficial, setOnlyOfficial] = useState(true);
  const startedAt = useRef<number>(0);

  const startExam = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("questions")
        .select("id, enunciado, alternativas, correta, area, disciplina, ano")
        .eq("incomplete", false);
      if (onlyOfficial) query = query.eq("origem", "enem.dev");
      const { data, error } = await query.limit(400);
      if (error) throw error;
      const rows = (data || []) as DbQuestao[];
      if (rows.length === 0) throw new Error(onlyOfficial
        ? "Nenhuma questão oficial importada ainda. Desative 'Apenas oficiais' ou peça ao admin para importar."
        : "Banco vazio. Importe questões primeiro.");
      // Embaralha e pega N
      const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_TARGET);
      setQuestoes(shuffled);
      startedAt.current = Date.now();
      setStarted(true);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar simulado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!started || finished) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const left = DURATION_SECONDS - elapsed;
      setRemaining(left);
      if (left <= 0) { clearInterval(id); setFinished(true); }
    }, 1000);
    return () => clearInterval(id);
  }, [started, finished]);

  const report = useMemo(() => {
    if (!finished) return null;
    const byArea = new Map<string, { hit: number; total: number }>();
    questoes.forEach((q) => {
      const key = q.area || q.disciplina || "Outros";
      const cur = byArea.get(key) || { hit: 0, total: 0 };
      cur.total++;
      if (answers[q.id] && answers[q.id] === q.correta) cur.hit++;
      byArea.set(key, cur);
    });
    const totalHit = [...byArea.values()].reduce((s, v) => s + v.hit, 0);
    const total = [...byArea.values()].reduce((s, v) => s + v.total, 0);
    return {
      areas: [...byArea.entries()].map(([area, v]) => ({
        area,
        ...v,
        tri: toENEMScale(Math.round((v.hit / Math.max(1, v.total)) * 1000)),
      })),
      totalHit,
      total,
      triGeral: toENEMScale(Math.round((totalHit / Math.max(1, total)) * 1000)),
    };
  }, [finished, questoes, answers]);

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Modo prova ENEM</h1>
            <p className="text-xs text-muted-foreground truncate">{QUESTIONS_TARGET} questões · 5h30 · sem Flora</p>
          </div>
          {started && !finished && (
            <div className={`flex items-center gap-1.5 text-sm font-mono ${remaining < 600 ? "text-destructive" : "text-muted-foreground"}`}>
              <Clock className="w-4 h-4" /> {format(remaining)}
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6 space-y-4">
        {!started && (
          <article className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <h2 className="text-xl font-bold">Pronto para começar?</h2>
            <p className="text-sm text-muted-foreground">
              Simulado oficial, sem ajuda da Flora. Cronômetro de 5h30 e relatório de pontuação estimada (TRI) ao final.
            </p>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOfficial}
                onChange={(e) => setOnlyOfficial(e.target.checked)}
                className="rounded border-border"
              />
              Usar apenas questões oficiais do ENEM
            </label>
            <Button onClick={startExam} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Iniciar prova
            </Button>
          </article>
        )}

        {started && !finished && questoes[idx] && (
          <article className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Questão {idx + 1} / {questoes.length}</span>
              <span className="text-primary font-semibold">{questoes[idx].area}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{questoes[idx].enunciado}</p>
            <div className="space-y-2">
              {(["A","B","C","D","E"] as const).map((letra) => {
                const alts = questoes[idx].alternativas as Record<string, string>;
                const txt = alts?.[letra];
                if (!txt) return null;
                const chosen = answers[questoes[idx].id] === letra;
                return (
                  <button
                    key={letra}
                    onClick={() => setAnswers((a) => ({ ...a, [questoes[idx].id]: letra }))}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm flex gap-3 ${
                      chosen ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <span className="font-bold w-5">{letra}</span>
                    <span className="flex-1">{txt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>Anterior</Button>
              {idx < questoes.length - 1 ? (
                <Button className="flex-1" onClick={() => setIdx((i) => i + 1)}>Próxima</Button>
              ) : (
                <Button className="flex-1" onClick={() => setFinished(true)}>Finalizar prova</Button>
              )}
            </div>
          </article>
        )}

        {finished && report && (
          <article className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <header className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TRI estimada (geral)</p>
              <p className="text-5xl font-bold text-primary">{report.triGeral}</p>
              <p className="text-sm text-muted-foreground">
                {report.totalHit} acertos de {report.total} questões
              </p>
            </header>
            <div className="space-y-2">
              {report.areas.map((a) => (
                <div key={a.area} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{a.area}</p>
                    <p className="text-xs text-muted-foreground">{a.hit}/{a.total} acertos</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{a.tri}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/analise")}>
                Ver análise completa
              </Button>
              <Button className="flex-1" onClick={() => navigate("/")}>Voltar</Button>
            </div>
          </article>
        )}

        {started && !finished && (
          <p className="text-xs text-muted-foreground text-center">
            <Check className="inline w-3 h-3 mr-1" /> Respondidas: {Object.keys(answers).length} ·
            <X className="inline w-3 h-3 mx-1" /> Pendentes: {questoes.length - Object.keys(answers).length}
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}