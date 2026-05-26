import { useEffect, useState } from "react";
import { Loader2, Sparkles, Wand2, Check, X, ChevronRight, ChevronLeft, RotateCcw, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { MathText } from "@/components/MathText";

const DISCIPLINAS_ENEM = [
  "Matemática", "Português", "Literatura", "Redação", "Inglês", "Espanhol",
  "Física", "Química", "Biologia",
  "História", "Geografia", "Filosofia", "Sociologia", "Artes",
];

type GenQuestion = {
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  correta: string;
  explicacao: string;
  tema?: string;
  disciplina?: string;
};

const LS_LAST_SESSION = "enem-gen-last-session-v1";

type SavedSession = {
  questions: GenQuestion[];
  answers: Record<string, string>;
  index: number;
  materia: string;
  assunto: string;
  nivel: "facil" | "medio" | "dificil";
  savedAt: number;
};

function loadLastSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(LS_LAST_SESSION);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Array.isArray(p?.questions) || !p.questions.length) return null;
    return p as SavedSession;
  } catch { return null; }
}

function saveSession(s: SavedSession) {
  try { localStorage.setItem(LS_LAST_SESSION, JSON.stringify(s)); } catch { /* ignore */ }
}

export function GenerateEnemQuestionsDialog({
  defaultDisciplina,
  defaultTema,
}: {
  defaultDisciplina?: string;
  defaultTema?: string;
}) {
  const [open, setOpen] = useState(false);
  const [materia, setMateria] = useState(
    defaultDisciplina && DISCIPLINAS_ENEM.includes(defaultDisciplina) ? defaultDisciplina : "Matemática"
  );
  const [assunto, setAssunto] = useState(defaultTema ?? "");
  const [quantidade, setQuantidade] = useState(5);
  const [nivel, setNivel] = useState<"facil" | "medio" | "dificil">("medio");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GenQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => { setHasSaved(!!loadLastSession()); }, [open]);

  // Persiste a sessão atual a cada mudança
  useEffect(() => {
    if (!questions) return;
    saveSession({ questions, answers, index, materia, assunto, nivel, savedAt: Date.now() });
    setHasSaved(true);
  }, [questions, answers, index, materia, assunto, nivel]);

  function reset() {
    setQuestions(null); setIndex(0); setAnswers({});
  }

  function resumeLast() {
    const s = loadLastSession();
    if (!s) return;
    setMateria(s.materia);
    setAssunto(s.assunto);
    setNivel(s.nivel);
    setQuestions(s.questions);
    setAnswers(s.answers || {});
    setIndex(Math.min(s.index || 0, s.questions.length - 1));
  }

  function redoLast() {
    const s = loadLastSession();
    if (!s) return;
    setMateria(s.materia);
    setAssunto(s.assunto);
    setNivel(s.nivel);
    setQuestions(s.questions);
    setAnswers({});
    setIndex(0);
  }

  async function handleGenerate() {
    if (!assunto.trim()) { toast.error("Informe o assunto (ex: Funções, Genética…)"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions-user", {
        body: {
          banca: "ENEM",
          materia,
          assunto: assunto.trim(),
          quantidade,
          nivel,
          tipo: "multipla_escolha",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const qs: GenQuestion[] = ((data as any).questions ?? []).map((q: any) => ({
        ...q, disciplina: q.disciplina || materia,
      }));
      if (!qs.length) { toast.error("IA não retornou questões. Tente outro assunto."); return; }
      setQuestions(qs);
      setIndex(0);
      setAnswers({});
      toast.success(`${qs.length} questões geradas no estilo ENEM!`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar questões");
    } finally {
      setLoading(false);
    }
  }

  function answer(letter: string) {
    const q = questions?.[index]; if (!q || answers[q.id]) return;
    setAnswers((p) => ({ ...p, [q.id]: letter }));
  }

  const current = questions?.[index];
  const chosen = current ? answers[current.id] : undefined;
  const acertos = questions ? questions.filter((q) => answers[q.id] === q.correta).length : 0;
  const respondidas = Object.keys(answers).length;
  const allDone = questions && respondidas === questions.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Wand2 className="w-4 h-4" /> Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Questões ENEM com IA
          </DialogTitle>
          <DialogDescription>
            {questions
              ? `Questão ${index + 1} de ${questions.length} • ${acertos} acerto${acertos !== 1 ? "s" : ""}`
              : "A Flora cria questões inéditas no estilo ENEM sobre o tema que você escolher."}
          </DialogDescription>
        </DialogHeader>

        {!questions && (
          <div className="space-y-3 py-2">
            {hasSaved && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <History className="w-3.5 h-3.5" /> Você tem uma sessão anterior salva
                </span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resumeLast}>Continuar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={redoLast}>Refazer</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Disciplina</Label>
                <Select value={materia} onValueChange={setMateria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DISCIPLINAS_ENEM.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select value={nivel} onValueChange={(v) => setNivel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tema / assunto</Label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex: Citologia, Funções do 2º grau, Revolução Industrial…"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade: <span className="font-semibold">{quantidade}</span></Label>
              <input
                type="range" min={1} max={5} value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">Máximo de 5 por geração.</p>
            </div>
          </div>
        )}

        {current && (
          <div className="space-y-3 py-2 min-w-0">
            <div className="rounded-lg border border-border bg-card p-3 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-x-auto">
              <MathText>{current.enunciado}</MathText>
            </div>
            <div className="space-y-2">
              {current.alternativas.map((a) => {
                const isCorrect = chosen && a.letra === current.correta;
                const isWrong = chosen === a.letra && a.letra !== current.correta;
                return (
                  <button
                    key={a.letra}
                    onClick={() => answer(a.letra)}
                    disabled={!!chosen}
                    className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors flex gap-2 items-start break-words ${
                      isCorrect ? "border-emerald-500 bg-emerald-500/10"
                      : isWrong ? "border-destructive bg-destructive/10"
                      : chosen ? "border-border opacity-60"
                      : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <span className="font-semibold shrink-0">{a.letra})</span>
                    <span className="flex-1 min-w-0 break-words"><MathText inline>{a.texto}</MathText></span>
                    {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isWrong && <X className="w-4 h-4 text-destructive shrink-0" />}
                  </button>
                );
              })}
            </div>
            {chosen && current.explicacao && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm break-words whitespace-pre-wrap">
                <p className="font-semibold mb-1 text-primary">Explicação</p>
                <MathText>{current.explicacao}</MathText>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {!questions && (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Fechar</Button>
              <Button onClick={handleGenerate} disabled={loading || !assunto.trim()}>
                {loading ? (<><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Gerando…</>)
                  : (<><Wand2 className="w-4 h-4 mr-1.5" /> Gerar {quantidade}</>)}
              </Button>
            </>
          )}
          {questions && (
            <>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Novas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Anterior
              </Button>
              {index < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}
                >
                  Próxima <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => setOpen(false)} disabled={!allDone}>
                  {allDone ? `Concluir (${acertos}/${questions.length})` : "Responda todas"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}