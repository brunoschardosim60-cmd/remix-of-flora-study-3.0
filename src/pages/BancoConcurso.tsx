import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Filter,
  Loader2, RotateCcw, Search, Sparkles, Star, Timer, X, BarChart3, Wand2, Brain,
  ListChecks, Target, Trophy, Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { MathText } from "@/components/MathText";
import { scheduleSpacedReviews } from "@/lib/spacedReviews";
import { parseFunctionError } from "@/lib/quotaErrors";
import { getCachedExplanation, setCachedExplanation } from "@/lib/explainCache";

type Alt = { letra: string; texto: string };
type Question = {
  id: string;
  ano: number | null;
  banca: string;
  orgao: string;
  cargo: string;
  disciplina: string;
  tema: string;
  enunciado: string;
  correta: string;
  alternativas: Alt[];
  dificuldade: string;
  explicacao: string;
  tipo?: "multipla_escolha" | "certo_errado";
  afirmativa?: string;
  nivel?: string;
  source?: "banco" | "ia";
  temporary?: boolean;
};
type Attempt = { question_id: string; alternativa_marcada: string; acertou: boolean };
type AttemptFull = Attempt & { banca?: string; disciplina?: string };

const FAVORITES_KEY = "banco-concurso-favorites-v1";
const IA_SESSION_KEY = "banco-concurso-ia-session-v1";
// Expiração da sessão IA: 24h (em linha com a tabela Supabase)
const IA_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function saveFavorites(s: Set<string>) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(s))); } catch { /* ignore */ }
}

function hashEnunciado(s: string): string {
  // hash simples + estável (djb2) — só pra detectar duplicatas no cliente
  let h = 5381;
  const norm = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < norm.length; i++) h = ((h << 5) + h) + norm.charCodeAt(i);
  return (h >>> 0).toString(36);
}

type IaSessionSnapshot = {
  id: string;
  banca: string;
  materia: string;
  assunto: string;
  nivel: string;
  tipo: string;
  questions: Question[];
  answers: Record<string, string>;
  index: number;
  focus: string[];
  modoFocoErros: boolean;
  createdAt: number;
};

// ── Camada 1: sessionStorage (acesso instantâneo, sobrevive F5 mas não ao fechar aba) ──

function loadIaSessionLocal(): IaSessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(IA_SESSION_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as IaSessionSnapshot;
    if (!snap.createdAt || Date.now() - snap.createdAt > IA_SESSION_TTL_MS) {
      sessionStorage.removeItem(IA_SESSION_KEY);
      return null;
    }
    return snap;
  } catch { return null; }
}

function saveIaSessionLocal(snap: IaSessionSnapshot | null) {
  try {
    if (!snap) sessionStorage.removeItem(IA_SESSION_KEY);
    else sessionStorage.setItem(IA_SESSION_KEY, JSON.stringify(snap));
  } catch { /* ignora se sessionStorage cheio */ }
}

// ── Camada 2: Supabase (persiste entre abas e sessões, expira em 24h no banco) ──

async function saveIaSessionRemote(snap: IaSessionSnapshot): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("concurso_ia_sessions").upsert(
      {
        id: snap.id,
        user_id: user.id,
        banca: snap.banca,
        materia: snap.materia,
        assunto: snap.assunto,
        nivel: snap.nivel,
        tipo: snap.tipo,
        questions: snap.questions as any,
        answers: snap.answers as any,
        current_index: snap.index,
        focus: snap.focus,
        modo_foco_erros: snap.modoFocoErros,
        expires_at: new Date(snap.createdAt + IA_SESSION_TTL_MS).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch { /* falha silenciosa — sessionStorage ainda funciona */ }
}

async function loadIaSessionRemote(): Promise<IaSessionSnapshot | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await (supabase as any)
      .from("concurso_ia_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      banca: data.banca,
      materia: data.materia,
      assunto: data.assunto,
      nivel: data.nivel,
      tipo: data.tipo,
      questions: (data.questions as unknown as Question[]) ?? [],
      answers: (data.answers as unknown as Record<string, string>) ?? {},
      index: data.current_index ?? 0,
      focus: data.focus ?? [],
      modoFocoErros: data.modo_foco_erros ?? false,
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch { return null; }
}

async function deleteIaSessionRemote(id: string): Promise<void> {
  try {
    await (supabase as any).from("concurso_ia_sessions").delete().eq("id", id);
  } catch { /* ignora */ }
}

// ── API unificada usada pelo componente ──

function saveIaSession(snap: IaSessionSnapshot | null) {
  saveIaSessionLocal(snap);
  if (snap) {
    // Fire-and-forget: persiste em background sem bloquear a UI
    void saveIaSessionRemote(snap);
  }
}

async function loadIaSession(): Promise<IaSessionSnapshot | null> {
  // Tenta local primeiro (instantâneo)
  const local = loadIaSessionLocal();
  if (local) return local;
  // Fallback: busca do Supabase (recupera sessão de outra aba ou após fechar)
  const remote = await loadIaSessionRemote();
  if (remote) {
    // Popula sessionStorage para próximas leituras serem instantâneas
    saveIaSessionLocal(remote);
  }
  return remote;
}

function getAlternativas(q: Question): Alt[] {
  return Array.isArray(q.alternativas) ? q.alternativas : [];
}

// Painel de alternativas (até 4 — A-D)
function AlternativasPanel({
  q, chosen, onAnswer,
}: { q: Question; chosen?: string; onAnswer: (l: string) => void }) {
  const alts = getAlternativas(q);
  return (
    <div className="space-y-2">
      {alts.map((alt) => {
        const isChosen = chosen === alt.letra;
        const isCorrect = !!chosen && alt.letra === q.correta;
        const isWrong = isChosen && alt.letra !== q.correta;
        return (
          <button
            key={alt.letra}
            onClick={() => onAnswer(alt.letra)}
            disabled={!!chosen}
            className={`w-full text-left flex gap-3 rounded-xl border-2 p-3.5 transition-all duration-150 ${
              isCorrect
                ? "border-emerald-500 bg-emerald-500/10"
                : isWrong
                ? "border-destructive bg-destructive/10"
                : isChosen
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            } ${chosen ? "cursor-default" : "cursor-pointer"}`}
          >
            <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold leading-none ${
              isCorrect ? "bg-emerald-500 text-white"
              : isWrong ? "bg-destructive text-destructive-foreground"
              : isChosen ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
            }`}>{alt.letra}</span>
            <div className="flex-1 min-w-0">
              {alt.texto && (
                <MathText className="text-sm leading-relaxed" inline>{alt.texto}</MathText>
              )}
            </div>
            {isCorrect && <Check className="shrink-0 w-4 h-4 text-emerald-600 self-center" />}
            {isWrong && <X className="shrink-0 w-4 h-4 text-destructive self-center" />}
          </button>
        );
      })}
    </div>
  );
}

// Painel certo/errado (Cebraspe)
function CertoErradoPanel({
  q, chosen, onAnswer,
}: { q: Question; chosen?: string; onAnswer: (v: string) => void }) {
  return (
    <div className="space-y-3">
      {q.afirmativa && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Afirmativa</p>
          <MathText className="text-sm leading-relaxed">{q.afirmativa}</MathText>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(["certo", "errado"] as const).map((v) => {
          const isChosen = chosen === v;
          const isCorrect = !!chosen && v === q.correta;
          const isWrong = isChosen && v !== q.correta;
          return (
            <button
              key={v}
              onClick={() => onAnswer(v)}
              disabled={!!chosen}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold capitalize transition-all duration-150 ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : isWrong
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : isChosen
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              } ${chosen ? "cursor-default" : "cursor-pointer"}`}
            >
              {isCorrect && <Check className="w-4 h-4" />}
              {isWrong && <X className="w-4 h-4" />}
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BancoConcurso() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [banca, setBanca] = useState("Todas");
  const [orgao, setOrgao] = useState("Todas");
  const [disciplina, setDisciplina] = useState("Todas");
  const [ano, setAno] = useState("Todos");

  const [opened, setOpened] = useState<Question | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [defaultBanca, setDefaultBanca] = useState<string>("");

  // Geração IA pro usuário (sessão temporária)
  const [iaDialogOpen, setIaDialogOpen] = useState(false);
  const [iaBanca, setIaBanca] = useState("FGV");
  const [iaMateria, setIaMateria] = useState("Português");
  const [iaAssunto, setIaAssunto] = useState("");
  const [iaNivel, setIaNivel] = useState<"facil" | "medio" | "dificil">("medio");
  const [iaTipo, setIaTipo] = useState<"multipla_escolha" | "certo_errado">("multipla_escolha");
  const [iaQtd, setIaQtd] = useState(3);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSession, setIaSession] = useState<Question[] | null>(null);
  const [iaIndex, setIaIndex] = useState(0);
  const [iaAnswers, setIaAnswers] = useState<Record<string, string>>({});
  const [iaFocus, setIaFocus] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [iaSavingIds, setIaSavingIds] = useState<Set<string>>(new Set());
  const [iaSavedIds, setIaSavedIds] = useState<Set<string>>(new Set());
  const [iaFocoErros, setIaFocoErros] = useState(false);
  const [iaSubtemasFracos, setIaSubtemasFracos] = useState<string[]>([]);
  const [iaSessionId, setIaSessionId] = useState<string>("");
  const [iaPrevEnunciados, setIaPrevEnunciados] = useState<string[]>([]);
  const [iaModoFocoAtivo, setIaModoFocoAtivo] = useState(false);
  const [iaShowReview, setIaShowReview] = useState(false);
  // Trilhas automáticas baseadas em student_performance
  const [trilhas, setTrilhas] = useState<Array<{
    topicKey: string; materia: string; tema: string; banca?: string;
    accuracy: number; erros: number; acertos: number; prioridade: number;
  }>>([]);

  // Modo prova
  const [examMode, setExamMode] = useState(false);
  const [examQueue, setExamQueue] = useState<Question[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const [examElapsed, setExamElapsed] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      // Carrega banca preferida do onboarding e pré-seleciona o filtro
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ob } = await supabase
          .from("student_onboarding")
          .select("banca")
          .eq("user_id", user.id)
          .maybeSingle();
        if (ob?.banca) {
          setDefaultBanca(ob.banca);
          setBanca(ob.banca);
          setIaBanca(ob.banca);
        }

        // Verifica se é admin (para botão "salvar no banco" na sessão IA)
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        setIsAdmin(!!prof?.is_admin);

        // Tentativas anteriores
        const { data: att } = await supabase
          .from("concurso_question_attempts")
          .select("question_id,alternativa_marcada,acertou")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1000);
        const map: Record<string, Attempt> = {};
        (att ?? []).forEach((a: any) => {
          if (!map[a.question_id]) map[a.question_id] = a as Attempt;
        });
        setAttempts(map);

        // Trilhas automáticas: prioridades calculadas pela Flora Engine
        const { data: perf } = await supabase
          .from("student_performance")
          .select("topic_id,materia,acertos,erros,accuracy,prioridade")
          .eq("user_id", user.id)
          .order("prioridade", { ascending: false })
          .limit(50);
        const tr = (perf ?? [])
          .filter((p: any) => String(p.topic_id || "").startsWith("concurso"))
          .map((p: any) => {
            const parts = String(p.topic_id).split("::");
            return {
              topicKey: p.topic_id as string,
              materia: (p.materia || parts[1] || "Concurso") as string,
              tema: (parts[2] || "geral") as string,
              accuracy: Number(p.accuracy ?? 0),
              erros: Number(p.erros ?? 0),
              acertos: Number(p.acertos ?? 0),
              prioridade: Number(p.prioridade ?? 0),
            };
          })
          .filter((t) => t.acertos + t.erros >= 1)
          .slice(0, 6);
        setTrilhas(tr);

        // Subtemas fracos (auto-detectados): pra mostrar no modal "Foco nos erros"
        const fracos = (perf ?? [])
          .filter((p: any) => String(p.topic_id || "").startsWith("concurso") && (p.erros ?? 0) > (p.acertos ?? 0))
          .map((p: any) => String(p.topic_id || "").split("::")[2] || "")
          .filter(Boolean);
        setIaSubtemasFracos(Array.from(new Set(fracos)).slice(0, 6));
      }

      // Restaura sessão IA — tenta local (instantâneo) ou Supabase (entre abas/sessões)
      const hadLocal = !!loadIaSessionLocal();
      const snap = await loadIaSession();
      if (snap) {
        setIaSession(snap.questions);
        setIaAnswers(snap.answers);
        setIaIndex(snap.index);
        setIaFocus(snap.focus);
        setIaSessionId(snap.id);
        setIaBanca(snap.banca);
        setIaMateria(snap.materia);
        setIaAssunto(snap.assunto);
        setIaNivel(snap.nivel as any);
        setIaTipo(snap.tipo as any);
        setIaModoFocoAtivo(snap.modoFocoErros);
        // Informa o usuário apenas quando recuperou do servidor (sessão estava perdida localmente)
        if (!hadLocal) {
          toast.info("Sessão IA recuperada", {
            description: `${snap.questions.length} questões de ${snap.materia} — ${snap.assunto || snap.banca}`,
          });
        }
      }

      // Questões
      const { data, error } = await supabase
        .from("concurso_questions")
        .select("id,ano,banca,orgao,cargo,disciplina,tema,enunciado,correta,alternativas,dificuldade,explicacao,tipo,afirmativa,nivel")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) toast.error("Erro ao carregar questões");
      else setQuestions((data ?? []) as Question[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const bancas = useMemo(() => {
    const set = new Set(questions.map((q) => q.banca).filter(Boolean));
    return ["Todas", ...Array.from(set).sort()];
  }, [questions]);

  const disciplinas = useMemo(() => {
    const set = new Set(questions.map((q) => q.disciplina).filter(Boolean));
    return ["Todas", ...Array.from(set).sort()];
  }, [questions]);

  const anos = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) if (q.ano != null) set.add(String(q.ano));
    return ["Todos", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [questions]);

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    return questions.filter((q) => {
      if (banca !== "Todas" && q.banca !== banca) return false;
      if (disciplina !== "Todas" && q.disciplina !== disciplina) return false;
      if (ano !== "Todos" && String(q.ano) !== ano) return false;
      if (s) {
        const hay = (q.enunciado + " " + q.tema + " " + q.disciplina).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (onlyErrors && attempts[q.id]?.acertou !== false) return false;
      if (onlyFavorites && !favorites.has(q.id)) return false;
      return true;
    });
  }, [questions, debouncedSearch, banca, disciplina, ano, onlyErrors, onlyFavorites, favorites, attempts]);

  const stats = useMemo(() => {
    const arr = Object.values(attempts);
    return { total: arr.length, acertos: arr.filter((a) => a.acertou).length, erros: arr.filter((a) => !a.acertou).length };
  }, [attempts]);
  const pct = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;

  // Métricas por matéria e banca (cruzando attempts com questions)
  const breakdown = useMemo(() => {
    const byMat: Record<string, { acertos: number; total: number }> = {};
    const byBanca: Record<string, { acertos: number; total: number }> = {};
    const qMap = new Map(questions.map((q) => [q.id, q]));
    for (const a of Object.values(attempts)) {
      const q = qMap.get(a.question_id);
      if (!q) continue;
      const mat = q.disciplina || "Sem disciplina";
      const bnc = q.banca || "Sem banca";
      byMat[mat] = byMat[mat] || { acertos: 0, total: 0 };
      byMat[mat].total++;
      if (a.acertou) byMat[mat].acertos++;
      byBanca[bnc] = byBanca[bnc] || { acertos: 0, total: 0 };
      byBanca[bnc].total++;
      if (a.acertou) byBanca[bnc].acertos++;
    }
    const toSorted = (obj: Record<string, { acertos: number; total: number }>) =>
      Object.entries(obj)
        .map(([k, v]) => ({ key: k, ...v, pct: v.total ? Math.round((v.acertos / v.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total);
    return { porMateria: toSorted(byMat), porBanca: toSorted(byBanca) };
  }, [attempts, questions]);

  // Pontos fracos: temas com mais erros (mín 2 tentativas)
  const pontosFracos = useMemo(() => {
    const byTema: Record<string, { acertos: number; total: number; banca: string; disciplina: string }> = {};
    const qMap = new Map(questions.map((q) => [q.id, q]));
    for (const a of Object.values(attempts)) {
      const q = qMap.get(a.question_id);
      if (!q) continue;
      const key = `${q.disciplina || "?"} · ${q.tema || "geral"}`;
      byTema[key] = byTema[key] || { acertos: 0, total: 0, banca: q.banca, disciplina: q.disciplina };
      byTema[key].total++;
      if (a.acertou) byTema[key].acertos++;
    }
    return Object.entries(byTema)
      .filter(([, v]) => v.total >= 2)
      .map(([k, v]) => ({ key: k, ...v, pct: Math.round((v.acertos / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, [attempts, questions]);

  const openedIndex = useMemo(
    () => (opened ? filtered.findIndex((q) => q.id === opened.id) : -1),
    [opened, filtered],
  );
  function navigateModal(dir: -1 | 1) {
    if (openedIndex < 0) return;
    const next = filtered[openedIndex + dir];
    if (!next) return;
    setOpened(next);
  }

  async function recordAttempt(q: Question, letter: string, modo: "livre" | "prova") {
    const acertou = letter === q.correta;
    setAttempts((p) => ({ ...p, [q.id]: { question_id: q.id, alternativa_marcada: letter, acertou } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("concurso_question_attempts").insert({
      user_id: user.id, question_id: q.id, alternativa_marcada: letter, acertou, modo,
    });

    // ── Revisões automáticas híbridas ────────────────────────────────────
    // Topic key estável por disciplina+tema (não por questão) — agrupa o aprendizado.
    const topicKey = `concurso::${(q.disciplina || "geral").toLowerCase()}::${(q.tema || "geral").toLowerCase()}`;
    const materia = q.disciplina || "Concurso";

    // 1) Atualiza student_performance (acertos/erros, accuracy, prioridade)
    try {
      const { data: perf } = await supabase
        .from("student_performance")
        .select("acertos,erros")
        .eq("user_id", user.id)
        .eq("topic_id", topicKey)
        .maybeSingle();
      const acertos = (perf?.acertos ?? 0) + (acertou ? 1 : 0);
      const erros = (perf?.erros ?? 0) + (acertou ? 0 : 1);
      const total = acertos + erros;
      const accuracy = total > 0 ? Math.round((acertos / total) * 100) : 0;
      const erroRecorrente = erros >= 3;
      const prioridade = Math.round(erros * 10 + (100 - accuracy));
      await supabase.from("student_performance").upsert(
        { user_id: user.id, topic_id: topicKey, materia, acertos, erros, accuracy, erro_recorrente: erroRecorrente, prioridade },
        { onConflict: "user_id,topic_id" },
      );
    } catch { /* não bloqueia o fluxo do quiz */ }

    // 2) Agenda revisões espaçadas 1/3/7/15 — idempotente por (user, topic, data)
    //    A "1ª tentativa" é determinada pela ausência de student_performance prévio
    //    para este topicKey; em tentativas seguintes não criamos duplicatas porque
    //    scheduleSpacedReviews ignora datas já agendadas.
    try {
      await scheduleSpacedReviews(user.id, topicKey, materia, [1, 3, 7, 15]);
    } catch { /* idem */ }
  }

  // ── Salva uma questão como flashcard de revisão espaçada ──────────────
  // Cria/atualiza um study_topic dedicado "Flashcards Concurso – {disciplina}"
  // e anexa o flashcard com pergunta=enunciado, resposta=correta + explicação.
  async function saveAsFlashcard(q: Question) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para salvar flashcards");
      return;
    }
    const disciplina = q.disciplina || "Concurso";
    const topicId = `flashcards-concurso::${disciplina.toLowerCase()}`;
    const tema = `Flashcards Concurso – ${disciplina}`;

    const pergunta = (q.tipo === "certo_errado" ? q.afirmativa : q.enunciado) || q.enunciado || "";
    const respostaBase = q.tipo === "certo_errado"
      ? `Resposta: ${q.correta === "C" || /^certo$/i.test(q.correta) ? "Certo" : "Errado"}`
      : `Alternativa correta: ${q.correta.toUpperCase()}`;
    const resposta = q.explicacao
      ? `${respostaBase}\n\n${q.explicacao}`
      : respostaBase;
    const novoFlash = {
      id: `bc-${q.id}`,
      pergunta: pergunta.slice(0, 1000),
      resposta: resposta.slice(0, 2000),
      acertos: 0,
      erros: 0,
      streak: 0,
      intervalDays: 1,
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      origem: "banco_concurso",
      banca: q.banca || "",
    };

    try {
      const { data: existing } = await supabase
        .from("study_topics")
        .select("id, flashcards")
        .eq("user_id", user.id)
        .eq("id", topicId)
        .maybeSingle();

      const flashcards = Array.isArray(existing?.flashcards) ? [...(existing!.flashcards as any[])] : [];
      if (flashcards.some((f: any) => f?.id === novoFlash.id)) {
        toast.info("Já está nos seus flashcards");
        return;
      }
      flashcards.push(novoFlash);

      if (existing) {
        await supabase.from("study_topics").update({
          flashcards,
          updated_at: new Date().toISOString(),
        }).eq("id", topicId).eq("user_id", user.id);
      } else {
        await supabase.from("study_topics").insert({
          id: topicId,
          user_id: user.id,
          tema,
          materia: disciplina,
          study_date: new Date().toISOString().slice(0, 10),
          flashcards,
        });
      }
      // Agenda revisões: 1/3/7 dias
      try { await scheduleSpacedReviews(user.id, topicId, disciplina, [1, 3, 7]); } catch { /* opcional */ }
      toast.success("Flashcard salvo · revise amanhã");
    } catch (err) {
      console.warn("[saveAsFlashcard] erro:", err);
      toast.error("Não consegui salvar o flashcard");
    }
  }

  function handleAnswer(q: Question, letter: string) {
    if (revealed[q.id]) return;
    setRevealed((r) => ({ ...r, [q.id]: letter }));
    recordAttempt(q, letter, "livre");
  }

  async function explainWithAI(q: Question) {
    if (aiLoading === q.id) return;
    const chosen = revealed[q.id] || attempts[q.id]?.alternativa_marcada || "";
    // Cache local: questão já explicada antes (mesma alternativa marcada) → instantâneo
    const cached = getCachedExplanation(q.id, chosen);
    if (cached) {
      setAiExplanations((p) => ({ ...p, [q.id]: cached }));
      return;
    }
    setAiLoading(q.id);
    setAiExplanations((p) => ({ ...p, [q.id]: "" }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Faça login para usar a explicação por IA"); setAiLoading(null); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-question`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enunciado: q.enunciado || q.afirmativa || "",
          alternativaMarcada: chosen,
          correta: q.correta,
          ano: q.ano,
          disciplina: q.disciplina,
          tema: q.tema,
        }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Limite de IA atingido. Tente em instantes.");
        else if (resp.status === 402) toast.error("Créditos de IA esgotados.");
        else toast.error("Erro ao gerar explicação");
        setAiLoading(null);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setAiExplanations((p) => ({ ...p, [q.id]: acc }));
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      // Persiste no cache local após o stream
      if (acc.trim()) setCachedExplanation(q.id, chosen, acc);
    } catch (e) {
      toast.error("Erro ao gerar explicação");
    } finally {
      setAiLoading(null);
    }
  }

  function startExam() {
    const pool = filtered.length >= 10 ? filtered : questions;
    if (pool.length === 0) {
      toast.error("Não há questões suficientes para o simulado");
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));
    setExamQueue(shuffled);
    setExamAnswers({});
    setExamIndex(0);
    setExamStartedAt(Date.now());
    setExamElapsed(0);
    setExamFinished(false);
    setExamMode(true);
  }

  // ─── Geração IA pro usuário (não salva no banco) ────────────────────────
  function handleIaBancaChange(b: string) {
    setIaBanca(b);
    const isCespe = b.toLowerCase().includes("cespe") || b.toLowerCase().includes("cebraspe");
    setIaTipo(isCespe ? "certo_errado" : "multipla_escolha");
  }

  async function generateForMe() {
    if (!iaAssunto.trim()) {
      toast.error("Informe o assunto");
      return;
    }
    setIaLoading(true);
    try {
      // Antiduplicata: passa enunciados das últimas sessões IA da mesma matéria/assunto
      const { data: { user: u0 } } = await supabase.auth.getUser();
      let evitarEnunciados: string[] = [];
      if (u0) {
        const { data: prev } = await supabase
          .from("concurso_ia_attempts")
          .select("enunciado,assunto,disciplina,created_at")
          .eq("user_id", u0.id)
          .eq("disciplina", iaMateria)
          .ilike("assunto", iaAssunto.trim())
          .order("created_at", { ascending: false })
          .limit(40);
        const seen = new Set<string>();
        for (const r of (prev ?? []) as any[]) {
          const e = String(r.enunciado || "").trim();
          if (!e || seen.has(e)) continue;
          seen.add(e);
          evitarEnunciados.push(e.slice(0, 200));
          if (evitarEnunciados.length >= 15) break;
        }
        // Reforça com a sessão atual em memória
        if (iaSession) {
          for (const q of iaSession) {
            const e = String(q.enunciado || q.afirmativa || "").trim();
            if (e && !seen.has(e)) { seen.add(e); evitarEnunciados.push(e.slice(0, 200)); }
          }
        }
      }

      const { data, error } = await supabase.functions.invoke("generate-questions-user", {
        body: {
          banca: iaBanca, materia: iaMateria, assunto: iaAssunto.trim(),
          quantidade: iaQtd, nivel: iaNivel, tipo: iaTipo,
          focoErros: iaFocoErros,
          evitarEnunciados,
        },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      const qs: Question[] = (payload.questions ?? []).map((q: any) => ({
        ...q, source: "ia" as const,
      }));
      if (!qs.length) { toast.error("IA não retornou questões"); return; }
      const newSessionId = `ia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setIaSessionId(newSessionId);
      setIaSession(qs);
      setIaIndex(0);
      setIaAnswers({});
      setIaFocus(payload.foco ?? []);
      setIaModoFocoAtivo(!!payload.modoFocoErros);
      setIaShowReview(false);
      setIaDialogOpen(false);
      // Persiste sessionStorage
      saveIaSession({
        id: newSessionId, banca: iaBanca, materia: iaMateria, assunto: iaAssunto.trim(),
        nivel: iaNivel, tipo: iaTipo,
        questions: qs, answers: {}, index: 0,
        focus: payload.foco ?? [], modoFocoErros: !!payload.modoFocoErros,
        createdAt: Date.now(),
      });
      if (payload.personalizado) {
        toast.success(`${qs.length} questões geradas — focadas nos seus erros!`);
      } else {
        toast.success(`${qs.length} questões geradas pra você`);
      }
    } catch (e: any) {
      const parsed = await parseFunctionError(e);
      toast.error(parsed.message || e?.message || "Erro ao gerar questões");
    } finally {
      setIaLoading(false);
    }
  }

  function answerIa(letter: string) {
    const q = iaSession?.[iaIndex];
    if (!q || iaAnswers[q.id]) return;
    const next = { ...iaAnswers, [q.id]: letter };
    setIaAnswers(next);
    // Atualiza snapshot do sessionStorage
    if (iaSession) {
      saveIaSession({
        id: iaSessionId || `ia-${Date.now()}`,
        banca: iaBanca, materia: iaMateria, assunto: iaAssunto,
        nivel: iaNivel, tipo: iaTipo,
        questions: iaSession, answers: next, index: iaIndex,
        focus: iaFocus, modoFocoErros: iaModoFocoAtivo,
        createdAt: Date.now(),
      });
    }
    // Questão IA é temporária (id não existe em concurso_questions),
    // então não vai pra concurso_question_attempts. Mas alimentamos
    // student_performance pra Flora considerar nas próximas sessões.
    void recordIaAttempt(q, letter);
  }

  async function recordIaAttempt(q: Question, letter: string) {
    const acertou = letter === q.correta;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const topicKey = `concurso-ia::${(q.disciplina || "geral").toLowerCase()}::${(q.tema || iaAssunto || "geral").toLowerCase()}`;
    const materia = q.disciplina || iaMateria || "Concurso";

    // 1) Registro separado das tentativas IA (não polui concurso_question_attempts)
    try {
      await supabase.from("concurso_ia_attempts").insert({
        user_id: user.id,
        session_id: iaSessionId || "session-orphan",
        banca: q.banca || iaBanca,
        disciplina: q.disciplina || iaMateria,
        tema: q.tema || iaAssunto,
        assunto: iaAssunto,
        nivel: q.nivel || iaNivel,
        tipo: q.tipo || iaTipo,
        enunciado: (q.enunciado || q.afirmativa || "").slice(0, 4000),
        enunciado_hash: hashEnunciado(q.enunciado || q.afirmativa || ""),
        alternativa_marcada: letter,
        correta: q.correta,
        acertou,
        payload: { explicacao: q.explicacao || "" },
      });
    } catch { /* ignore */ }

    // 2) Alimenta student_performance pra Flora considerar nas próximas decisões
    try {
      const { data: perf } = await supabase
        .from("student_performance")
        .select("acertos,erros")
        .eq("user_id", user.id)
        .eq("topic_id", topicKey)
        .maybeSingle();
      const acertos = (perf?.acertos ?? 0) + (acertou ? 1 : 0);
      const erros = (perf?.erros ?? 0) + (acertou ? 0 : 1);
      const total = acertos + erros;
      const accuracy = total > 0 ? Math.round((acertos / total) * 100) : 0;
      const erroRecorrente = erros >= 3;
      const prioridade = Math.round(erros * 10 + (100 - accuracy));
      await supabase.from("student_performance").upsert(
        { user_id: user.id, topic_id: topicKey, materia, acertos, erros, accuracy, erro_recorrente: erroRecorrente, prioridade },
        { onConflict: "user_id,topic_id" },
      );
    } catch { /* não bloqueia o fluxo */ }
  }

  // (c) Admin: salvar questão IA no banco oficial
  async function saveIaQuestionToBank(q: Question) {
    if (!isAdmin) return;
    if (iaSavedIds.has(q.id) || iaSavingIds.has(q.id)) return;
    setIaSavingIds((s) => new Set(s).add(q.id));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        banca: q.banca || iaBanca,
        disciplina: q.disciplina || iaMateria,
        tema: q.tema || iaAssunto,
        enunciado: q.enunciado || "",
        afirmativa: q.afirmativa || "",
        alternativas: q.tipo === "certo_errado" ? [] : (q.alternativas || []),
        correta: q.correta,
        explicacao: q.explicacao || "",
        tipo: q.tipo || "multipla_escolha",
        nivel: q.nivel || iaNivel,
        dificuldade: q.dificuldade || iaNivel,
        origem: "ia_gerada",
        tags: ["gerado_por_ia", q.banca || iaBanca, "salvo_da_sessao"],
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("concurso_questions").insert(payload);
      if (error) throw error;
      setIaSavedIds((s) => new Set(s).add(q.id));
      toast.success("Questão adicionada ao banco");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar questão");
    } finally {
      setIaSavingIds((s) => {
        const next = new Set(s); next.delete(q.id); return next;
      });
    }
  }
  function nextIa() {
    if (!iaSession) return;
    if (iaIndex < iaSession.length - 1) {
      const nextIdx = iaIndex + 1;
      setIaIndex(nextIdx);
      saveIaSession({
        id: iaSessionId, banca: iaBanca, materia: iaMateria, assunto: iaAssunto,
        nivel: iaNivel, tipo: iaTipo, questions: iaSession, answers: iaAnswers,
        index: nextIdx, focus: iaFocus, modoFocoErros: iaModoFocoAtivo,
        createdAt: Date.now(),
      });
    } else {
      // Última questão: abre tela de revisão
      setIaShowReview(true);
    }
  }
  function closeIa() {
    // Remove sessão local e remota ao fechar conscientemente
    if (iaSessionId) void deleteIaSessionRemote(iaSessionId);
    saveIaSessionLocal(null);
    setIaSession(null);
    setIaIndex(0);
    setIaAnswers({});
    setIaFocus([]);
    setIaShowReview(false);
    setIaSessionId("");
    setIaModoFocoAtivo(false);
  }

  // Trilha automática → preenche modal IA com matéria/tema/banca
  function startTrilha(t: { materia: string; tema: string; banca?: string }) {
    if (t.banca) setIaBanca(t.banca);
    setIaMateria(t.materia);
    setIaAssunto(t.tema);
    setIaFocoErros(true);
    setIaDialogOpen(true);
  }
  useEffect(() => {
    if (!examMode || examFinished || !examStartedAt) return;
    const t = setInterval(() => setExamElapsed(Math.floor((Date.now() - examStartedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [examMode, examFinished, examStartedAt]);
  function answerExam(letter: string) {
    const q = examQueue[examIndex];
    if (!q || examAnswers[q.id]) return;
    setExamAnswers((a) => ({ ...a, [q.id]: letter }));
    recordAttempt(q, letter, "prova");
  }
  function nextExam() {
    if (examIndex < examQueue.length - 1) {
      setExamIndex((i) => i + 1);
    } else {
      setExamFinished(true);
      // Registrar resultado consolidado do simulado (separado das tentativas individuais).
      void persistSimuladoResult();
    }
  }

  async function persistSimuladoResult() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || examQueue.length === 0) return;
      let acertos = 0;
      examQueue.forEach((q) => { if (examAnswers[q.id] === q.correta) acertos++; });
      const bancas = Array.from(new Set(examQueue.map((q) => q.banca).filter(Boolean)));
      const disciplinas = Array.from(new Set(examQueue.map((q) => q.disciplina).filter(Boolean)));
      const bancaPrincipal = bancas.length === 1 ? bancas[0] : (defaultBanca || bancas[0] || "");
      const discPrincipal = disciplinas.length === 1 ? disciplinas[0] : "";
      const titulo = discPrincipal
        ? `Simulado · ${discPrincipal}${bancaPrincipal ? ` (${bancaPrincipal})` : ""}`
        : `Simulado · ${examQueue.length} questões${bancaPrincipal ? ` (${bancaPrincipal})` : ""}`;
      const duracao = (examStartedAt ? Date.now() - examStartedAt : examElapsed * 1000);
      await supabase.from("concurso_simulado_results").insert({
        user_id: user.id,
        titulo,
        banca: bancaPrincipal || "",
        disciplina: discPrincipal || "",
        total_questoes: examQueue.length,
        acertos,
        duracao_ms: duracao,
        origem: "banco",
        metadata: { bancas, disciplinas },
      });
    } catch (err) {
      console.warn("[persistSimuladoResult] erro:", err);
    }
  }
  function closeExam() {
    setExamMode(false); setExamFinished(false);
    setExamQueue([]); setExamAnswers({}); setExamStartedAt(null);
  }
  const examScore = useMemo(() => {
    let acertos = 0;
    examQueue.forEach((q) => { if (examAnswers[q.id] === q.correta) acertos++; });
    return acertos;
  }, [examQueue, examAnswers]);

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Banco de Concurso</h1>
            <p className="text-xs text-muted-foreground">
              {questions.length} questões {defaultBanca && `· sua banca: ${defaultBanca}`}
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Stats */}
        {stats.total > 0 ? (
          <Card className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.total} respondidas</span>
                <span className="font-medium text-foreground">{pct}% de acerto</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3 h-3" />{stats.acertos} certas
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <X className="w-3 h-3" />{stats.erros} erradas
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Button size="sm" variant={showStats ? "default" : "outline"} onClick={() => setShowStats((v) => !v)}>
                <BarChart3 className="w-4 h-4 mr-1.5" /> Métricas
              </Button>
              <Button size="sm" variant={onlyErrors ? "default" : "outline"} onClick={() => setOnlyErrors((v) => !v)} disabled={stats.erros === 0}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Refazer erros
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIaDialogOpen(true)}>
                <Wand2 className="w-4 h-4 mr-1.5" /> Gerar pra mim
              </Button>
              <Button size="sm" onClick={startExam}>
                <Timer className="w-4 h-4 mr-1.5" /> Simular prova
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">Resolva questões para acompanhar seu progresso.</p>
            <Button size="sm" variant="outline" onClick={() => setIaDialogOpen(true)}>
              <Wand2 className="w-4 h-4 mr-1.5" /> Gerar pra mim
            </Button>
            <Button size="sm" onClick={startExam} disabled={questions.length === 0}>
              <Timer className="w-4 h-4 mr-1.5" /> Simular prova
            </Button>
          </Card>
        )}

        {/* Métricas detalhadas */}
        {showStats && stats.total > 0 && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Desempenho detalhado</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por matéria</p>
                {breakdown.porMateria.slice(0, 6).map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate pr-2">{row.key}</span>
                      <span className="tabular-nums text-muted-foreground">{row.pct}% ({row.acertos}/{row.total})</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${row.pct >= 70 ? "bg-emerald-500" : row.pct >= 50 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
                {breakdown.porMateria.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem dados.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por banca</p>
                {breakdown.porBanca.slice(0, 6).map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate pr-2">{row.key}</span>
                      <span className="tabular-nums text-muted-foreground">{row.pct}% ({row.acertos}/{row.total})</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${row.pct >= 70 ? "bg-emerald-500" : row.pct >= 50 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
                {breakdown.porBanca.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem dados.</p>
                )}
              </div>
            </div>
            {pontosFracos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pontos fracos · onde focar</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pontosFracos.map((row) => (
                    <div key={row.key} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{row.key}</span>
                        <Badge variant="destructive" className="text-[10px]">{row.pct}%</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {row.acertos}/{row.total} certas
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Trilhas automáticas (Flora) */}
        {trilhas.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Trilhas pra você</h3>
              <Badge variant="outline" className="text-[10px] ml-1">Flora</Badge>
              <span className="ml-auto text-[11px] text-muted-foreground">por prioridade</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sugestões baseadas nos seus erros recentes. Toque para gerar uma sessão IA focada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trilhas.map((t) => {
                const lowAcc = t.accuracy < 60;
                return (
                  <button
                    key={t.topicKey}
                    onClick={() => startTrilha(t)}
                    className="text-left rounded-xl border border-border hover:border-primary/60 transition-colors bg-card p-3 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={lowAcc ? "destructive" : "secondary"} className="text-[10px]">
                        {t.accuracy}%
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{t.materia}</span>
                      {t.erros >= 3 && <Lightbulb className="w-3 h-3 text-amber-500 ml-auto" />}
                    </div>
                    <p className="text-sm font-medium leading-tight line-clamp-2">{t.tema}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>{t.acertos}/{t.acertos + t.erros} certas</span>
                      <span className="text-primary font-medium">Estudar →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Card className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar por enunciado, tema ou disciplina…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Select value={banca} onValueChange={setBanca}>
              <SelectTrigger><SelectValue placeholder="Banca" /></SelectTrigger>
              <SelectContent>{bancas.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={disciplina} onValueChange={setDisciplina}>
              <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
              <SelectContent>{disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>{filtered.length} resultado{filtered.length !== 1 && "s"}</span>
            {onlyErrors && <Badge variant="destructive" className="ml-1">só erros</Badge>}
            {onlyFavorites && <Badge variant="secondary" className="ml-1">só favoritas</Badge>}
            <Button
              size="sm" variant={onlyFavorites ? "default" : "ghost"}
              className="ml-auto h-7 px-2 text-xs"
              onClick={() => setOnlyFavorites((v) => !v)}
              aria-pressed={onlyFavorites}
            >
              <Star className={`w-3.5 h-3.5 mr-1 ${onlyFavorites ? "fill-current" : ""}`} />
              Favoritas ({favorites.size})
            </Button>
          </div>
        </Card>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, 200).map((q) => {
              const att = attempts[q.id];
              const isFav = favorites.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => setOpened(q)}
                  className="text-left group"
                >
                  <Card className={`p-4 hover:border-primary/60 transition-all duration-150 h-full flex flex-col gap-3 relative ${
                    att?.acertou ? "border-emerald-500/40 bg-emerald-500/[0.03]" : att && !att.acertou ? "border-destructive/40 bg-destructive/[0.03]" : ""
                  }`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {q.banca && <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{q.banca}</Badge>}
                      {q.ano && <Badge variant="outline" className="text-[11px] px-2 py-0.5">{q.ano}</Badge>}
                      {q.disciplina && (
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 truncate max-w-[140px]">{q.disciplina}</Badge>
                      )}
                      {att && (
                        <span className={`ml-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${att.acertou ? "bg-emerald-500" : "bg-destructive"}`}>
                          {att.acertou ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/85 line-clamp-4 leading-relaxed flex-1">
                      {(() => {
                        const text = q.enunciado || q.afirmativa || "";
                        return <>{text.slice(0, 240)}{text.length > 240 ? "…" : ""}</>;
                      })()}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-auto pt-1 border-t border-border/50">
                      {q.orgao && <span className="truncate">{q.orgao}</span>}
                      {q.tipo === "certo_errado" && <Badge variant="outline" className="text-[10px] px-1.5 py-0">C/E</Badge>}
                      <span className="ml-auto text-primary/70 group-hover:text-primary font-medium transition-colors">Ver questão →</span>
                    </div>
                    <span
                      role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(q.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); toggleFavorite(q.id); } }}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isFav ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}`}
                      aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      aria-pressed={isFav}
                    >
                      <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                    </span>
                  </Card>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-16">
                Nenhuma questão encontrada com esses filtros.
              </div>
            )}
          </div>
        )}
        {filtered.length > 200 && (
          <p className="text-xs text-center text-muted-foreground">Mostrando 200 de {filtered.length}. Refine os filtros para ver mais.</p>
        )}
      </div>

      {/* Modal questão */}
      {opened && !examMode && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setOpened(null)}
          role="dialog" aria-modal="true"
        >
          <div
            className="max-w-2xl w-full my-4 sm:my-8 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-muted/40">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {opened.banca && <Badge variant="secondary">{opened.banca}</Badge>}
                {opened.ano && <Badge variant="outline">{opened.ano}</Badge>}
                {opened.disciplina && <Badge variant="outline">{opened.disciplina}</Badge>}
                {opened.tema && (
                  <span className="text-xs text-muted-foreground truncate max-w-full sm:max-w-[200px] basis-full sm:basis-auto">
                    {opened.tema}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 -mr-1">
                <Button
                  variant="ghost" size="icon"
                  className={`rounded-full ${favorites.has(opened.id) ? "text-amber-500" : ""}`}
                  onClick={() => toggleFavorite(opened.id)}
                  aria-label={favorites.has(opened.id) ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Star className={`w-4 h-4 ${favorites.has(opened.id) ? "fill-current" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateModal(-1)} disabled={openedIndex <= 0} aria-label="Anterior">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[11px] text-muted-foreground tabular-nums px-1">
                  {openedIndex >= 0 ? `${openedIndex + 1}/${filtered.length}` : ""}
                </span>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateModal(1)} disabled={openedIndex < 0 || openedIndex >= filtered.length - 1} aria-label="Próxima">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setOpened(null)} aria-label="Fechar">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              <MathText className="text-[15px] leading-relaxed text-foreground select-text">
                {opened.enunciado}
              </MathText>
              {opened.tipo === "certo_errado" ? (
                <CertoErradoPanel
                  q={opened}
                  chosen={revealed[opened.id] || attempts[opened.id]?.alternativa_marcada}
                  onAnswer={(v) => handleAnswer(opened, v)}
                />
              ) : (
                <AlternativasPanel
                  q={opened}
                  chosen={revealed[opened.id] || attempts[opened.id]?.alternativa_marcada}
                  onAnswer={(letter) => handleAnswer(opened, letter)}
                />
              )}
              {(revealed[opened.id] || attempts[opened.id]) && (() => {
                const chosen = revealed[opened.id] || attempts[opened.id]?.alternativa_marcada;
                const acertou = chosen === opened.correta;
                return (
                  <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${acertou ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${acertou ? "bg-emerald-500" : "bg-destructive"}`}>
                      {acertou ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                    </span>
                    <p className={`text-sm font-medium ${acertou ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                      {acertou ? "Correto! Resposta: " : "Resposta correta: "}
                      <span className="font-bold capitalize">{opened.correta}</span>
                    </p>
                  </div>
                );
              })()}
              {opened.explicacao && (revealed[opened.id] || attempts[opened.id]) && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> Explicação
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {opened.explicacao}
                  </p>
                </div>
              )}
              {(revealed[opened.id] || attempts[opened.id]) && (() => {
                const chosen = revealed[opened.id] || attempts[opened.id]?.alternativa_marcada || "";
                const errouOpened = chosen && chosen !== opened.correta;
                if (!errouOpened) return null;
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => saveAsFlashcard(opened)}
                  >
                    <Brain className="w-4 h-4 mr-1.5" /> Salvar como flashcard de revisão
                  </Button>
                );
              })()}
              {(revealed[opened.id] || attempts[opened.id]) && (
                <div className="space-y-3">
                  {!aiExplanations[opened.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => explainWithAI(opened)}
                      disabled={aiLoading === opened.id}
                      className="w-full sm:w-auto"
                    >
                      {aiLoading === opened.id ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Pensando…</>
                      ) : (
                        <><Wand2 className="w-4 h-4 mr-1.5" /> Explicar melhor com IA</>
                      )}
                    </Button>
                  )}
                  {aiExplanations[opened.id] && (
                    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Sparkles className="w-3.5 h-3.5" /> Flora explica
                        </div>
                        {aiLoading !== opened.id && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => explainWithAI(opened)}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Refazer
                          </Button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {aiExplanations[opened.id]}
                        {aiLoading === opened.id && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modo Prova */}
      {examMode && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
            <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-tight">Simulado · {examQueue.length} questões</p>
                <p className="text-xs text-muted-foreground">
                  Questão {Math.min(examIndex + 1, examQueue.length)} de {examQueue.length} · {String(Math.floor(examElapsed / 60)).padStart(2, "0")}:{String(examElapsed % 60).padStart(2, "0")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeExam}>Sair</Button>
            </div>
          </div>
          <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
            {!examFinished && examQueue[examIndex] && (() => {
              const q = examQueue[examIndex];
              const chosen = examAnswers[q.id];
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {q.banca && <Badge variant="secondary">{q.banca}</Badge>}
                    {q.disciplina && <Badge variant="outline">{q.disciplina}</Badge>}
                  </div>
                  <MathText className="text-[15px] leading-relaxed text-foreground select-text">
                    {q.enunciado}
                  </MathText>
                  {q.tipo === "certo_errado" ? (
                    <CertoErradoPanel q={q} chosen={chosen} onAnswer={answerExam} />
                  ) : (
                    <AlternativasPanel q={q} chosen={chosen} onAnswer={answerExam} />
                  )}
                  {chosen && (
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${chosen === q.correta ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${chosen === q.correta ? "bg-emerald-500" : "bg-destructive"}`}>
                        {chosen === q.correta ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                      </span>
                      <p className={`text-sm font-medium ${chosen === q.correta ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                        {chosen === q.correta ? "Correto!" : "Resposta correta: "}
                        {chosen !== q.correta && <span className="font-bold">{q.correta}</span>}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={nextExam} disabled={!chosen} className="rounded-xl px-6">
                      {examIndex < examQueue.length - 1 ? "Próxima" : "Finalizar"}
                    </Button>
                  </div>
                </>
              );
            })()}
            {examFinished && (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <BookOpen className="w-9 h-9 text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">Simulado finalizado!</h2>
                  <p className="text-muted-foreground text-sm">Tempo: {String(Math.floor(examElapsed / 60)).padStart(2, "0")}:{String(examElapsed % 60).padStart(2, "0")}</p>
                </div>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-6xl font-black text-primary">{examScore}</span>
                  <span className="text-2xl text-muted-foreground mb-2">/ {examQueue.length}</span>
                </div>
                <div className="flex gap-4 justify-center text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Check className="w-4 h-4" />{examScore} certas</span>
                  <span className="flex items-center gap-1.5 text-destructive"><X className="w-4 h-4" />{examQueue.length - examScore} erradas</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button variant="outline" onClick={startExam}><Timer className="w-4 h-4 mr-1.5" /> Novo simulado</Button>
                  <Button onClick={closeExam}>Voltar ao banco</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />

      {/* Dialog: Gerar pra mim (IA) */}
      <Dialog open={iaDialogOpen} onOpenChange={setIaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Gerar questões pra mim
            </DialogTitle>
            <DialogDescription>
              Flora cria questões no estilo da banca, focando nos seus erros recentes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Banca</Label>
              <Select value={iaBanca} onValueChange={handleIaBancaChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["FGV", "CESPE/Cebraspe", "FCC", "Vunesp", "IBFC", "Quadrix", "AOCP", "Outra"].map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={iaTipo} onValueChange={(v) => setIaTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multipla_escolha">Múltipla escolha</SelectItem>
                  <SelectItem value="certo_errado">Certo / Errado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Matéria</Label>
              <Select value={iaMateria} onValueChange={setIaMateria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Português", "Matemática", "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico", "Informática", "Atualidades", "Conhecimentos Gerais"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nível</Label>
              <Select value={iaNivel} onValueChange={(v) => setIaNivel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Assunto</Label>
              <Input
                value={iaAssunto}
                onChange={(e) => setIaAssunto(e.target.value)}
                placeholder="Ex: Interpretação de texto, Concordância verbal…"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Quantidade: <span className="font-semibold">{iaQtd}</span></Label>
              <input
                type="range" min={1} max={5} value={iaQtd}
                onChange={(e) => setIaQtd(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="col-span-2 rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Lightbulb className={`w-4 h-4 shrink-0 ${iaFocoErros ? "text-amber-500" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">Gerar com foco nos meus erros</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      A IA prioriza subtemas que você mais erra.
                    </p>
                  </div>
                </div>
                <Switch checked={iaFocoErros} onCheckedChange={setIaFocoErros} />
              </div>
              {iaFocoErros && iaSubtemasFracos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Subtemas detectados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {iaSubtemasFracos.map((s) => (
                      <button
                        key={s}
                        onClick={() => setIaAssunto(s)}
                        className="text-[11px] px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {iaFocoErros && iaSubtemasFracos.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Ainda sem dados suficientes — resolva algumas questões pra Flora identificar seus pontos fracos.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIaDialogOpen(false)} disabled={iaLoading}>Cancelar</Button>
            <Button onClick={generateForMe} disabled={iaLoading || !iaAssunto.trim()}>
              {iaLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Gerando…</> : <><Wand2 className="w-4 h-4 mr-1.5" /> Gerar {iaQtd}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay: Sessão IA */}
      {iaSession && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
            <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Sessão IA · {iaSession.length} questões</p>
                <p className="text-xs text-muted-foreground truncate">
                  {iaShowReview
                    ? `Revisão · ${iaBanca} · ${iaMateria}`
                    : `Questão ${Math.min(iaIndex + 1, iaSession.length)} de ${iaSession.length} · ${iaBanca}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeIa}>Sair</Button>
            </div>
          </div>
          <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
            {iaShowReview ? (() => {
              const total = iaSession.length;
              const acertos = iaSession.filter((q) => iaAnswers[q.id] === q.correta).length;
              const erros = Object.keys(iaAnswers).length - acertos;
              const pctReview = total ? Math.round((acertos / total) * 100) : 0;
              return (
                <div className="space-y-5">
                  <Card className="p-5 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Trophy className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Sessão concluída!</h2>
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-5xl font-black text-primary tabular-nums">{acertos}</span>
                      <span className="text-xl text-muted-foreground mb-1.5">/ {total}</span>
                    </div>
                    <div className="flex justify-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" /> {acertos} certas
                      </span>
                      <span className="flex items-center gap-1.5 text-destructive">
                        <X className="w-4 h-4" /> {erros} erradas
                      </span>
                      <span className="text-muted-foreground">{pctReview}% acerto</span>
                    </div>
                  </Card>

                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Suas respostas</h3>
                  </div>
                  <div className="space-y-3">
                    {iaSession.map((q, idx) => {
                      const chosen = iaAnswers[q.id];
                      const acertou = chosen === q.correta;
                      const naoResp = !chosen;
                      return (
                        <Card
                          key={q.id}
                          className={`p-4 space-y-3 ${
                            naoResp
                              ? "border-muted"
                              : acertou
                              ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                              : "border-destructive/40 bg-destructive/[0.03]"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{q.disciplina}</Badge>
                            {q.tema && <Badge variant="outline" className="text-[10px] truncate max-w-[180px]">{q.tema}</Badge>}
                            {q.tipo === "certo_errado" && <Badge variant="outline" className="text-[10px]">C/E</Badge>}
                            <span className={`ml-auto text-xs font-semibold flex items-center gap-1 ${
                              naoResp ? "text-muted-foreground" : acertou ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                            }`}>
                              {naoResp ? "—" : acertou ? <><Check className="w-3.5 h-3.5" /> Acertou</> : <><X className="w-3.5 h-3.5" /> Errou</>}
                            </span>
                          </div>
                          {(q.enunciado || q.afirmativa) && (
                            <MathText className="text-sm text-foreground/90 leading-relaxed" inline>
                              {q.enunciado || q.afirmativa || ""}
                            </MathText>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-border px-3 py-1.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sua resposta</p>
                              <p className="font-semibold capitalize">{chosen || "—"}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
                              <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Correta</p>
                              <p className="font-semibold capitalize">{q.correta}</p>
                            </div>
                          </div>
                          {q.explicacao && (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-1">
                                <Sparkles className="w-3 h-3" /> Explicação
                              </div>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/85">
                                {q.explicacao}
                              </p>
                            </div>
                          )}
                          {!acertou && !naoResp && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => saveAsFlashcard(q)}
                              >
                                <Brain className="w-3 h-3 mr-1.5" /> Salvar como flashcard
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => setIaShowReview(false)}>
                      <ChevronLeft className="w-4 h-4 mr-1.5" /> Voltar à sessão
                    </Button>
                    <Button onClick={() => { closeIa(); setIaDialogOpen(true); }}>
                      <Wand2 className="w-4 h-4 mr-1.5" /> Nova sessão
                    </Button>
                  </div>
                </div>
              );
            })() : (<>
            {iaFocus.length > 0 && iaIndex === 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/85">
                  <span className="font-semibold">{iaModoFocoAtivo ? "Foco nos erros:" : "Personalizado:"}</span> {iaModoFocoAtivo ? "todas as questões miram " : "foquei em pontos que você costuma errar — "}{iaFocus.join(", ")}.
                </p>
              </div>
            )}
            {(() => {
              const q = iaSession[iaIndex];
              const chosen = iaAnswers[q.id];
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{q.banca}</Badge>
                    <Badge variant="outline">{q.disciplina}</Badge>
                    <Badge variant="outline" className="border-primary/40 text-primary">IA</Badge>
                    {q.tipo === "certo_errado" && <Badge variant="outline">C/E</Badge>}
                  </div>
                  {q.enunciado && (
                    <MathText className="text-[15px] leading-relaxed text-foreground select-text">
                      {q.enunciado}
                    </MathText>
                  )}
                  {q.tipo === "certo_errado" ? (
                    <CertoErradoPanel q={q} chosen={chosen} onAnswer={answerIa} />
                  ) : (
                    <AlternativasPanel q={q} chosen={chosen} onAnswer={answerIa} />
                  )}
                  {chosen && (
                    <>
                      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${chosen === q.correta ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${chosen === q.correta ? "bg-emerald-500" : "bg-destructive"}`}>
                          {chosen === q.correta ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                        </span>
                        <p className={`text-sm font-medium ${chosen === q.correta ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                          {chosen === q.correta ? "Correto!" : <>Resposta correta: <span className="font-bold capitalize">{q.correta}</span></>}
                        </p>
                      </div>
                      {q.explicacao && (
                        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <Sparkles className="w-3.5 h-3.5" /> Explicação
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{q.explicacao}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex flex-wrap justify-between gap-2">
                    <Button variant="outline" onClick={() => setIaShowReview(true)} disabled={Object.keys(iaAnswers).length === 0}>
                      <ListChecks className="w-4 h-4 mr-1.5" /> Revisar respostas
                    </Button>
                    {isAdmin && chosen && (
                      <Button
                        variant="secondary"
                        onClick={() => saveIaQuestionToBank(q)}
                        disabled={iaSavingIds.has(q.id) || iaSavedIds.has(q.id)}
                        className="rounded-xl"
                      >
                        {iaSavingIds.has(q.id) ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando…</>
                        ) : iaSavedIds.has(q.id) ? (
                          <><Check className="w-4 h-4 mr-1.5" /> No banco</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-1.5" /> Salvar no banco</>
                        )}
                      </Button>
                    )}
                    <Button onClick={nextIa} disabled={!chosen} className="rounded-xl px-6">
                      {iaIndex < iaSession.length - 1 ? "Próxima" : "Ver revisão"}
                    </Button>
                  </div>
                </>
              );
            })()}
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
