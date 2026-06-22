import { useEffect, useMemo, useRef, useState } from "react";
import { prefetchForContext } from "@/lib/prefetch";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, PlusCircle, Sparkles, Trash2, Wand2, Save, CheckCircle2, AlertCircle, Target, CalendarDays, CalendarRange, Dumbbell, Lightbulb, PanelLeftClose, PanelLeftOpen, WifiOff, CloudUpload, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPETENCIAS,
  correctEssay,
  countLines,
  countWords,
  createEssay,
  deleteEssay,
  listEssays,
  suggestEssayTheme,
  updateEssayDraft,
  type CompetenciaFeedback,
  type Essay,
} from "@/lib/essays";
import { reportError, toErrorMessage } from "@/lib/errorHandling";
import { exportEssayToPdf } from "@/lib/essayPdfExport";
import {
  saveLocalDraft,
  loadLocalDraft,
  clearLocalDraft,
  markPending,
  clearPending,
  getPendingDraftIds,
  isOnline as isOnlineNow,
} from "@/lib/essayDraftStore";

// ─── Card de reescrita: mostra a sugestão da Flora.
// Ao clicar em "Mostrar no texto", rola o textarea da redação até o parágrafo
// correspondente e dispara um pulse rápido pra localizar visualmente.
function RewriteFlipCard({
  suggestion,
  onJump,
  canJump,
}: {
  suggestion: string;
  onJump?: () => void;
  canJump?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Sugestão de reescrita</p>
        </div>
        {canJump && (
          <button
            type="button"
            onClick={onJump}
            className="text-[10px] font-medium uppercase tracking-wide text-primary/80 hover:text-primary"
          >
            Mostrar no texto →
          </button>
        )}
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-sm whitespace-pre-line italic">{suggestion}</p>
      </div>
    </div>
  );
}

// ─── Cor por competência (1-5) para destacar trechos ───────────────────────
const COMP_COLOR: Record<number, { bg: string; ring: string; text: string; label: string }> = {
  1: { bg: "bg-rose-500/15",    ring: "ring-rose-500/40",    text: "text-rose-700 dark:text-rose-300",       label: "C1" },
  2: { bg: "bg-amber-500/15",   ring: "ring-amber-500/40",   text: "text-amber-700 dark:text-amber-300",     label: "C2" },
  3: { bg: "bg-violet-500/15",  ring: "ring-violet-500/40",  text: "text-violet-700 dark:text-violet-300",   label: "C3" },
  4: { bg: "bg-sky-500/15",     ring: "ring-sky-500/40",     text: "text-sky-700 dark:text-sky-300",         label: "C4" },
  5: { bg: "bg-emerald-500/15", ring: "ring-emerald-500/40", text: "text-emerald-700 dark:text-emerald-300", label: "C5" },
};

// Interpola gradiente vermelho → âmbar → verde conforme percentual 0-100
function gradientBarStyle(pct: number): string {
  // hue: 0 (vermelho) -> 120 (verde)
  const hue = Math.max(0, Math.min(120, (pct / 100) * 120));
  return `hsl(${hue} 75% 45%)`;
}

// Renderiza um texto cru com destaques (trechos da Flora). Faz match case-insensitive.
function HighlightedEssay({ text, trechos }: { text: string; trechos: Array<{ trecho: string; competencia: number; problema: string; sugestao?: string }> }) {
  if (!text) return null;
  // Ordena trechos por posição no texto, descarta os que não bateram exatamente
  type Hit = { start: number; end: number; comp: number; problema: string; sugestao?: string };
  const hits: Hit[] = [];
  const lower = text.toLowerCase();
  for (const t of trechos || []) {
    const needle = (t.trecho || "").trim().toLowerCase();
    if (!needle || needle.length < 4) continue;
    const idx = lower.indexOf(needle);
    if (idx < 0) continue;
    hits.push({ start: idx, end: idx + needle.length, comp: t.competencia, problema: t.problema, sugestao: t.sugestao });
  }
  hits.sort((a, b) => a.start - b.start);
  // Resolve sobreposições: mantém o primeiro
  const clean: Hit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start < lastEnd) continue;
    clean.push(h);
    lastEnd = h.end;
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  clean.forEach((h, i) => {
    if (cursor < h.start) parts.push(<span key={`t-${i}`}>{text.slice(cursor, h.start)}</span>);
    const c = COMP_COLOR[h.comp] || COMP_COLOR[3];
    parts.push(
      <mark
        key={`m-${i}`}
        title={`${c.label} — ${h.problema}${h.sugestao ? `\n→ ${h.sugestao}` : ""}`}
        className={`rounded px-0.5 ${c.bg} ${c.text} ring-1 ${c.ring} cursor-help`}
      >
        {text.slice(h.start, h.end)}
      </mark>
    );
    cursor = h.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="whitespace-pre-wrap text-sm leading-relaxed font-serif">{parts}</p>;
}

// ─── Configuração por objetivo ────────────────────────────────────────────────

type Objetivo = "enem" | "vestibular" | "concurso" | "faculdade" | "aprender" | string;

function getObjetivoConfig(objetivo: Objetivo) {
  switch (objetivo) {
    case "enem":
    case "vestibular":
      return {
        label: "ENEM",
        minLines: 25,
        maxLines: 35,
        minWords: 150,
        placeholder: "Escreva sua redação dissertativa-argumentativa aqui. O ENEM exige entre 150 e 500 palavras.",
        dica: "O ENEM exige: tese clara, 2 argumentos desenvolvidos e proposta de intervenção completa.",
        isENEM: true,
      };
    case "concurso":
      return {
        label: "Concurso",
        minLines: 15,
        maxLines: 30,
        minWords: 100,
        placeholder: "Escreva sua redação dissertativa ou técnica aqui. Foque em clareza e objetividade.",
        dica: "Em concurso: seja objetivo, use linguagem formal e estruture bem introdução, desenvolvimento e conclusão.",
        isENEM: false,
      };
    case "faculdade":
    case "aprender":
    default:
      return {
        label: "Redação",
        minLines: 15,
        maxLines: 40,
        minWords: 100,
        placeholder: "Escreva sua redação aqui. Foque em clareza, coerência e argumentação.",
        dica: "Uma boa redação tem: tese clara, argumentos bem fundamentados e conclusão que retoma a tese.",
        isENEM: false,
      };
  }
}

// ─── Competências para UI ENEM ────────────────────────────────────────────────

const CRITERIOS_GERAL = [
  { key: "competencia_1", label: "Clareza e objetividade", desc: "A argumentação é direta e o leitor entende o ponto de vista?" },
  { key: "competencia_2", label: "Argumentação", desc: "Os argumentos são sólidos, coerentes e bem fundamentados?" },
  { key: "competencia_3", label: "Norma culta", desc: "Gramática, ortografia, concordância, regência, pontuação" },
  { key: "competencia_4", label: "Estrutura e coesão", desc: "A organização é eficiente? Os parágrafos se conectam?" },
] as const;

export default function Redacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionStep, setCorrectionStep] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo>("enem");
  const [tipoTexto, setTipoTexto] = useState<string>("dissertativo");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [feedbackRevealed, setFeedbackRevealed] = useState(false);
  const [lastSavedTexto, setLastSavedTexto] = useState("");
  const [lastSavedTema, setLastSavedTema] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean>(isOnlineNow());
  const [hasLocalPending, setHasLocalPending] = useState<boolean>(false);
  // Plano personalizado real (cruza dados reais do aluno)
  const [realPlan, setRealPlan] = useState<any | null>(null);
  const [realPlanMetrics, setRealPlanMetrics] = useState<any | null>(null);
  const [loadingRealPlan, setLoadingRealPlan] = useState(false);
  // Pulse de localização ao clicar em "Mostrar no texto"
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pulsing, setPulsing] = useState(false);
  function hashText(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(36);
  }
  function fingerprintOf(t: string, x: string) {
    return `${hashText(t.trim())}:${hashText(x.trim())}`;
  }

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
    prefetchForContext("redacao");
  }, [authLoading, user, navigate]);

  // Busca o objetivo do onboarding para adaptar a UI
  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_onboarding")
      .select("objetivo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.objetivo) setObjetivo(data.objetivo as Objetivo);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user]);

  // Recebe tema vindo de /redacao/temas (link "Escrever sobre este tema")
  // Cria automaticamente uma nova redação com o tema preenchido.
  useEffect(() => {
    if (!user) return;
    const state = location.state as { tema?: string; textoMotivador?: string } | null;
    const incomingTema = state?.tema?.trim();
    if (!incomingTema) return;
    // Limpa o state pra não recriar em remounts/back
    navigate(location.pathname, { replace: true, state: null });
    (async () => {
      try {
        const essay = await createEssay(user.id, incomingTema);
        setEssays((prev) => [essay, ...prev]);
        selectEssay(essay);
        toast.success("Tema carregado. Boa redação!");
      } catch (error) {
        reportError("createEssayFromTheme", error, { devOnly: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.state]);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listEssays();
      setEssays(list);
      if (list.length && !selectedId) selectEssay(list[0]);
    } catch (error) {
      reportError("listEssays", error, { devOnly: true });
      toast.error("Não foi possível carregar suas redações.");
    } finally {
      setLoading(false);
    }
  }

  function selectEssay(essay: Essay) {
    setSelectedId(essay.id);
    // Recupera rascunho local se for mais recente que o do servidor
    const local = loadLocalDraft(essay.id);
    const useLocal = local && (local.tema !== essay.tema || local.texto !== essay.texto);
    const tema0 = useLocal ? local!.tema : essay.tema;
    const texto0 = useLocal ? local!.texto : essay.texto;
    setTema(tema0);
    setTexto(texto0);
    setLastSavedTema(essay.tema);
    setLastSavedTexto(essay.texto);
    setHasLocalPending(!!useLocal);
    if (useLocal) {
      toast.info("Rascunho local restaurado.", {
        description: "Suas últimas alterações offline foram recuperadas.",
      });
    }
    setFeedbackRevealed(false);
    requestAnimationFrame(() => setFeedbackRevealed(true));
  }

  async function generateRealPlan() {
    setLoadingRealPlan(true);
    setRealPlan(null);
    setRealPlanMetrics(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-personalized-plan", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRealPlan(data?.data?.plano ?? null);
      setRealPlanMetrics(data?.data?.metricas ?? null);
      toast.success("Plano personalizado gerado com seus dados reais.");
    } catch (err) {
      toast.error(toErrorMessage(err, "Não consegui gerar o plano agora."));
    } finally {
      setLoadingRealPlan(false);
    }
  }

  // Rola o textarea até o parágrafo correspondente e dispara um pulse visual.
  function jumpToParagraph(paragraph?: string) {
    if (!paragraph) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const idx = texto.indexOf(paragraph.trim().slice(0, 40));
    if (idx >= 0) {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(idx, idx + paragraph.length);
      // Aproxima o scroll do textarea pra parte selecionada
      const ratio = idx / Math.max(1, texto.length);
      ta.scrollTop = ratio * (ta.scrollHeight - ta.clientHeight);
    }
    ta.scrollIntoView({ behavior: "smooth", block: "center" });
    setPulsing(false);
    requestAnimationFrame(() => setPulsing(true));
    window.setTimeout(() => setPulsing(false), 1400);
  }

  const selected = useMemo(() => essays.find((e) => e.id === selectedId) ?? null, [essays, selectedId]);

  // Salva no localStorage com debounce (sobrevivência offline) para evitar stuttering em textos longos
  useEffect(() => {
    if (!selected) return;
    if (selected.status === "corrigida") return;
    if (tema === lastSavedTema && texto === lastSavedTexto) {
      clearLocalDraft(selected.id);
      clearPending(selected.id);
      setHasLocalPending(false);
      return;
    }

    const timer = setTimeout(() => {
      saveLocalDraft(selected.id, { tema, texto });
      markPending(selected.id);
      setHasLocalPending(true);
    }, 1000); // 1s debounce para I/O local
    return () => clearTimeout(timer);
  }, [tema, texto, selected, lastSavedTema, lastSavedTexto]);

  // Listeners de online/offline
  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Flush automático de rascunhos pendentes quando volta online
  useEffect(() => {
    if (!online) return;
    const ids = getPendingDraftIds();
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const id of ids) {
        const draft = loadLocalDraft(id);
        if (!draft) { clearPending(id); continue; }
        try {
          await updateEssayDraft(id, { tema: draft.tema, texto: draft.texto });
          clearPending(id);
          if (selected?.id === id && !cancelled) {
            setLastSavedTema(draft.tema);
            setLastSavedTexto(draft.texto);
            setLastSavedAt(new Date());
            setHasLocalPending(false);
          }
        } catch {
          // mantém pendente
        }
      }
    })();
    return () => { cancelled = true; };
  }, [online, selected?.id]);

  // Bug 2 fix: se o usuário editar após correção, voltar para rascunho
  useEffect(() => {
    if (!selected || selected.status !== "corrigida") return;
    if (texto !== lastSavedTexto || tema !== lastSavedTema) {
      // Edição detectada pós-correção: rebaixa para rascunho
      setEssays((prev) =>
        prev.map((e) => (e.id === selected.id ? { ...e, status: "rascunho" as const } : e))
      );
    }
  }, [texto, tema, selected, lastSavedTexto, lastSavedTema]);

  // Autosave: debounce 30s
  useEffect(() => {
    if (!selected || selected.status === "corrigida") return;
    if (tema === lastSavedTema && texto === lastSavedTexto) return;
    if (!texto.trim()) return;
    if (!online) return; // offline: já está salvo local; servidor fica para o flush
    const timer = setTimeout(async () => {
      try {
        await updateEssayDraft(selected.id, { tema, texto });
        setLastSavedTema(tema);
        setLastSavedTexto(texto);
        setLastSavedAt(new Date());
        clearPending(selected.id);
        clearLocalDraft(selected.id);
        setHasLocalPending(false);
      } catch {
        toast.warning("Falha ao salvar automaticamente. Verifique sua conexão.");
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [tema, texto, selected, lastSavedTema, lastSavedTexto, online]);
  const config = getObjetivoConfig(objetivo);
  const wordCount = countWords(texto);
  const lineCount = countLines(texto);
  const lineProgress = Math.min(100, (lineCount / config.maxLines) * 100);

  // Cor da barra de progresso baseada no estado
  const progressColor =
    lineCount < config.minLines ? "bg-orange-400" :
    lineCount <= config.maxLines ? "bg-green-500" : "bg-red-400";

  async function handleNew() {
    if (!user) return;
    try {
      const essay = await createEssay(user.id, "");
      setEssays((prev) => [essay, ...prev]);
      selectEssay(essay);
      toast.success("Nova redação criada.");
    } catch (error) {
      reportError("createEssay", error, { devOnly: true });
      toast.error(toErrorMessage(error, "Não foi possível criar a redação."));
    }
  }

  async function handleSave() {
    if (!selected) return;
    if (!online) {
      toast.info("Você está offline. Rascunho salvo localmente.", {
        description: "Vou enviar ao servidor automaticamente quando reconectar.",
      });
      return;
    }
    setSaving(true);
    try {
      await updateEssayDraft(selected.id, { tema, texto });
      setLastSavedTema(tema);
      setLastSavedTexto(texto);
      setLastSavedAt(new Date());
      clearPending(selected.id);
      clearLocalDraft(selected.id);
      setHasLocalPending(false);
      await refresh();
      toast.success("Rascunho salvo.");
    } catch (error) {
      reportError("updateEssayDraft", error, { devOnly: true });
      toast.error(toErrorMessage(error, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSuggestTheme() {
    setSuggesting(true);
    try {
      const next = await suggestEssayTheme();
      setTema(next);
      toast.success("Tema sugerido pela Flora.");
    } catch (error) {
      reportError("suggestEssayTheme", error, { devOnly: true });
      toast.error(toErrorMessage(error, "Não foi possível sugerir um tema."));
    } finally {
      setSuggesting(false);
    }
  }

  async function handleCorrect() {
    if (!selected) return;
    if (correcting) return; // 🛡️ guard duplo clique / StrictMode
    if (lineCount < config.minLines) {
      toast.error(`Escreva pelo menos ${config.minLines} linhas para uma redação completa.`);
      return;
    }
    // Mantém o fingerprint só para informar — o clique sempre dispara nova correção
    const currentFp = fingerprintOf(tema, texto);
    const savedFp =
      selected.status === "corrigida" && selected.corrected_at
        ? fingerprintOf(selected.tema, selected.texto)
        : null;
    if (savedFp && savedFp === currentFp) {
      toast.info("Reenviando para a Flora — texto sem alterações.");
    }
    setCorrecting(true);
    setCorrectionStep("Salvando rascunho...");
    try {
      await updateEssayDraft(selected.id, { tema, texto });
      setCorrectionStep("Analisando estrutura e argumentos...");
      // Small delay so user sees the step change
      await new Promise(r => setTimeout(r, 400));
      setCorrectionStep("Flora corrigindo competências...");
      const result = await correctEssay(selected.id, tema, texto, {
        tipoTexto: objetivo === "concurso" ? tipoTexto : undefined,
      });
      setCorrectionStep("Finalizando correção...");
      await refresh();
      setFeedbackRevealed(false);
      requestAnimationFrame(() => setFeedbackRevealed(true));
      if (result.truncated) {
        toast.warning("Seu texto foi truncado em 4000 caracteres para a correção. Apenas parte foi avaliada.", { duration: 8000 });
      }
      toast.success("Correção concluída pela Flora.");
    } catch (error) {
      reportError("correctEssay", error, { devOnly: true });
      toast.error(toErrorMessage(error, "Não foi possível corrigir a redação."));
    } finally {
      setCorrecting(false);
      setCorrectionStep(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar essa redação?")) return;
    try {
      await deleteEssay(id);
      if (selectedId === id) { setSelectedId(null); setTema(""); setTexto(""); }
      await refresh();
      toast.success("Redação removida.");
    } catch (error) {
      reportError("deleteEssay", error, { devOnly: true });
      toast.error(toErrorMessage(error, "Não foi possível apagar."));
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const feedbackComp = (selected?.feedback_competencias as CompetenciaFeedback | null) ?? null;
  const isCorrected = selected?.status === "corrigida" && selected.nota_total !== null;
  const isENEM = config.isENEM;

  // Para concurso/faculdade: nota_total está em escala 0-1000 (nota*100)
  // Converte de volta para 0-10
  const notaGeralDe10 = !isENEM && selected?.nota_total != null
    ? (selected.nota_total / 100).toFixed(1)
    : null;

  const metaObj = feedbackComp?._meta as any;
  const paragrafos = feedbackComp?._paragrafos;

  // Divide o texto do usuário em até 4 parágrafos lógicos (intro, dev1, dev2, conclusão).
  // Se o usuário escreveu mais que 4 parágrafos, junta o excedente no penúltimo.
  const userParagraphs: Record<string, string> = (() => {
    const raw = (selected?.texto || "").trim();
    if (!raw) return {};
    const parts = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return {};
    const keys = ["introducao", "desenvolvimento_1", "desenvolvimento_2", "conclusao"];
    const out: Record<string, string> = {};
    if (parts.length <= 4) {
      parts.forEach((p, i) => { out[keys[i]] = p; });
    } else {
      out.introducao = parts[0];
      out.desenvolvimento_1 = parts[1];
      out.conclusao = parts[parts.length - 1];
      out.desenvolvimento_2 = parts.slice(2, -1).join("\n\n");
    }
    return out;
  })();

  return (
    <div className="min-h-dvh bg-background">
      <div className="w-full mx-auto px-3 py-4 sm:px-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" aria-label="Voltar para o início" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold">
                Redação
                <Badge variant="secondary" className="ml-2 text-xs align-middle">{config.label}</Badge>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isENEM
                ? "Escreva e receba correção pelas 5 competências do ENEM."
                : `Escreva e receba correção no padrão ${config.label}.`}
            </p>
          </div>
          <Button onClick={() => void handleNew()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova redação
          </Button>
        </div>

        <div className={`grid gap-4 ${sidebarOpen ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
          {/* Sidebar */}
          <section className={`space-y-2 rounded-2xl border border-border bg-card/70 p-3 ${sidebarOpen ? "" : "hidden"}`}>
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium">Suas redações</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{essays.length}</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Recolher painel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : essays.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nenhuma redação ainda. Clique em "Nova redação".
              </p>
            ) : (
              <div className="space-y-2">
                {essays.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => selectEssay(e)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedId === e.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">{e.tema || "Sem tema"}</p>
                      {e.status === "corrigida" && e.nota_total !== null ? (() => {
                        const total10 = isENEM
                          ? (e.nota_total / 100)
                          : (e.nota_total / 100); // both already normalize to 0-10 scale below
                        const enemFaixa = isENEM ? e.nota_total : null;
                        const score10 = !isENEM ? (e.nota_total / 100) : null;
                        // Faixas: ENEM <600 vermelho, 600-799 âmbar, 800+ verde
                        // Outras: <6 vermelho, 6-7.9 âmbar, 8+ verde
                        const tone =
                          (enemFaixa !== null && enemFaixa >= 800) || (score10 !== null && score10 >= 8)
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                            : (enemFaixa !== null && enemFaixa >= 600) || (score10 !== null && score10 >= 6)
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30";
                        return (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                            {isENEM ? e.nota_total : `${(e.nota_total / 100).toFixed(1)}/10`}
                          </span>
                        );
                      })() : (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")} · {e.line_count} linhas
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Botão para reabrir sidebar quando recolhida */}
          {!sidebarOpen && (
            <div className="flex items-start lg:col-span-1">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="mb-2 flex items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
                title="Expandir redações"
              >
                <PanelLeftOpen className="h-4 w-4" />
                <span>Suas redações ({essays.length})</span>
              </button>
            </div>
          )}

          {/* Editor + Feedback */}
          <section className="space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-border bg-card/70 p-8 text-center text-sm text-muted-foreground">
                Selecione uma redação ou crie uma nova.
              </div>
            ) : (
              <>
                {/* Editor */}
                <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[260px] flex-1 space-y-1">
                      <label className="text-sm font-medium">Tema da redação</label>
                      <Input
                        value={tema}
                        onChange={(e) => setTema(e.target.value)}
                        placeholder={isENEM
                          ? "Ex: Os desafios da educação digital no Brasil"
                          : "Ex: A importância da transparência na gestão pública"}
                      />
                    </div>
                    <Button variant="outline" onClick={() => void handleSuggestTheme()} disabled={suggesting}>
                      {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Sugerir tema
                    </Button>
                  </div>

                  {objetivo === "concurso" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Tipo de texto:</label>
                      <Select value={tipoTexto} onValueChange={setTipoTexto}>
                        <SelectTrigger className="h-9 w-[260px] text-sm">
                          <SelectValue placeholder="Tipo de redação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dissertativo">Dissertativo-argumentativo</SelectItem>
                          <SelectItem value="oficio">Ofício (Padrão Ofício)</SelectItem>
                          <SelectItem value="parecer">Parecer técnico/jurídico</SelectItem>
                          <SelectItem value="exposicao_motivos">Exposição de Motivos</SelectItem>
                          <SelectItem value="relatorio">Relatório técnico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Dica contextual */}
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{config.dica}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Texto da redação</label>
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        {wordCount} palavras · ~{lineCount} linhas
                        {lastSavedAt && (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Salvo · {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {!online && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                            <WifiOff className="h-3 w-3" />
                            Offline · salvo localmente
                          </span>
                        )}
                        <span className={lineCount >= config.minLines && lineCount <= config.maxLines
                          ? " text-green-600" : " text-orange-500"}>
                          {" "}(alvo {config.minLines}–{config.maxLines})
                        </span>
                      </span>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder={config.placeholder}
                      className={`min-h-[420px] font-serif text-base leading-relaxed transition-shadow ${pulsing ? "ring-4 ring-primary/70 shadow-[0_0_0_6px_hsl(var(--primary)/0.15)] animate-pulse" : ""}`}
                    />
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                      <span>
                        Os <span className="underline decoration-red-500 decoration-wavy">pontinhos vermelhos</span> são do corretor do navegador (ortografia). Clica com o botão direito na palavra para ver sugestões. A <strong>correção completa da Flora</strong> (estrutura, argumentação, nota) sai quando clica em "Corrigir com a Flora".
                      </span>
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${lineProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void handleDelete(selected.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Apagar
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void handleSave()} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar rascunho
                      </Button>
                      <Button onClick={() => void handleCorrect()} disabled={correcting || !texto.trim()}>
                        {correcting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {correcting ? (correctionStep || "Corrigindo...") : "Corrigir com a Flora"}
                      </Button>
                    </div>
                  </div>

                  {/* Progressive correction overlay */}
                  {correcting && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <Wand2 className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-sm">Flora está corrigindo</p>
                          <p className="text-sm text-muted-foreground animate-pulse">{correctionStep}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {["Salvando rascunho...", "Analisando estrutura e argumentos...", "Flora corrigindo competências...", "Finalizando correção..."].map((step, i) => {
                          const steps = ["Salvando rascunho...", "Analisando estrutura e argumentos...", "Flora corrigindo competências...", "Finalizando correção..."];
                          const currentIdx = steps.indexOf(correctionStep || "");
                          const isDone = i < currentIdx;
                          const isCurrent = i === currentIdx;
                          return (
                            <div key={step} className={`flex items-center gap-2 text-sm transition-all duration-300 ${isDone ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground/50"}`}>
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : isCurrent ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                              )}
                              {step.replace("...", "")}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Feedback ── */}
                {isCorrected && (
                  <div className={`space-y-4 rounded-2xl border border-border bg-card/70 p-4 transition-all duration-500 ${feedbackRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h2 className="font-heading text-lg font-semibold">Correção da Flora</h2>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 h-8 gap-1"
                          onClick={async () => {
                            try {
                              await exportEssayToPdf(selected, isENEM);
                              toast.success("PDF gerado");
                            } catch (err) {
                              toast.error("Falha ao gerar PDF");
                              reportError("essay-pdf", err, { devOnly: true });
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar PDF
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Nota</p>
                        {isENEM ? (
                          <p className="font-heading text-3xl font-bold text-primary">
                            {selected.nota_total}
                            <span className="text-base text-muted-foreground"> pts</span>
                          </p>
                        ) : (
                          <p className="font-heading text-3xl font-bold text-primary">
                            {notaGeralDe10}
                            <span className="text-base text-muted-foreground"> / 10</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Alertas ENEM (fuga de tema, tipo textual) */}
                    {isENEM && (() => {
                      const meta = metaObj;
                      if (!meta) return null;
                      const isFuga = meta.fuga_tipo_textual || meta.aderencia_tema === "fuga_total";
                      const isTangencia = meta.aderencia_tema === "tangencia";
                      if (!isFuga && !isTangencia) return null;
                      const tone = isFuga
                        ? "border-destructive/40 bg-destructive/5 text-destructive"
                        : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400";
                      return (
                        <div className={`rounded-xl border p-3 ${tone}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isFuga ? "Alerta crítico" : "Atenção"}
                          </p>
                          <ul className="mt-1 space-y-1 text-sm">
                            {meta.fuga_tipo_textual && (
                              <li>Tipo textual identificado: <strong>{meta.tipo_textual}</strong>. O ENEM exige dissertativo-argumentativo — competências 2 a 5 zeradas.</li>
                            )}
                            {meta.aderencia_tema === "fuga_total" && (
                              <li>Fuga total ao tema. {meta.aderencia_justificativa}</li>
                            )}
                            {meta.aderencia_tema === "tangencia" && (
                              <li>Tangenciamento do tema. {meta.aderencia_justificativa}</li>
                            )}
                          </ul>
                        </div>
                      );
                    })()}

                    {/* Nível (concurso/faculdade) */}
                    {!isENEM && metaObj?.nivel && (
                      <div className="flex items-center gap-2">
                        <Badge>{metaObj.nivel}</Badge>
                      </div>
                    )}

                    {/* Feedback geral */}
                    {selected.feedback_geral && (
                      <div className="rounded-xl border border-border bg-background/60 p-3">
                        <p className="text-xs font-medium text-muted-foreground">Análise geral</p>
                        <p className="mt-1 text-sm">{selected.feedback_geral}</p>
                      </div>
                    )}

                    {/* Competências ENEM */}
                    {isENEM && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {COMPETENCIAS.map((comp) => {
                          const score = (selected[comp.key as keyof Essay] as number | null) ?? 0;
                          const fbRaw = feedbackComp?.[comp.key as keyof CompetenciaFeedback];
                          const fb = typeof fbRaw === "string" ? fbRaw : "";
                          const pct = (score / 200) * 100;
                          return (
                            <div key={comp.key} className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Competência {comp.num}
                                  </p>
                                  <p className="text-sm font-medium">{comp.title}</p>
                                </div>
                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                                  {score}<span className="text-xs text-muted-foreground">/200</span>
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, hsl(0 75% 50%), hsl(40 85% 50%), ${gradientBarStyle(pct)})`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">{comp.description}</p>
                              {fb && <p className="text-sm whitespace-pre-line">{fb}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Critérios para concurso/faculdade */}
                    {!isENEM && feedbackComp && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {CRITERIOS_GERAL.map((crit) => {
                          const fbRaw = feedbackComp[crit.key as keyof CompetenciaFeedback];
                          const fb = typeof fbRaw === "string" ? fbRaw : "";
                          if (!fb) return null;
                          return (
                            <div key={crit.key} className="space-y-1 rounded-xl border border-border bg-background/60 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{crit.label}</p>
                              <p className="text-xs text-muted-foreground">{crit.desc}</p>
                              <p className="text-sm">{fb}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Próximos passos (concurso/faculdade) */}
                    {!isENEM && metaObj?.proximos_passos?.length > 0 && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Próximos passos</p>
                        <ul className="space-y-1">
                          {(metaObj.proximos_passos as string[]).map((passo, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                              {passo}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Análise por parágrafo */}
                    {paragrafos && (
                      <div className="space-y-3">
                        <h3 className="font-heading text-base font-semibold">Análise por parágrafo</h3>
                        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                          {([
                            ["introducao", "Introdução"],
                            ["desenvolvimento_1", "Desenvolvimento 1"],
                            ["desenvolvimento_2", "Desenvolvimento 2"],
                            ["conclusao", "Conclusão / Proposta"],
                          ] as const).map(([key, label]) => {
                            const p = paragrafos?.[key];
                            if (!p) return null;
                            return (
                              <div key={key} className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                                <p className="text-sm">{p.diagnostico}</p>
                                {p.sugestao_reescrita && (
                                  <RewriteFlipCard
                                    suggestion={p.sugestao_reescrita}
                                    canJump={!!userParagraphs[key]}
                                    onJump={() => jumpToParagraph(userParagraphs[key])}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Texto com marcações inline */}
                    {(() => {
                      const trechos = (feedbackComp as any)?._trechos as Array<{ trecho: string; competencia: number; problema: string; sugestao?: string }> | undefined;
                      if (!trechos || trechos.length === 0) return null;
                      return (
                        <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-heading text-base font-semibold">Sua redação com marcações</h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span key={n} className={`rounded px-1.5 py-0.5 ring-1 ${COMP_COLOR[n].bg} ${COMP_COLOR[n].text} ${COMP_COLOR[n].ring}`}>
                                  C{n}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Passe o mouse sobre um trecho destacado para ver o problema apontado pela Flora.</p>
                          <div className="rounded-lg border border-border bg-background p-3 max-h-[420px] overflow-y-auto">
                            <HighlightedEssay text={selected?.texto || ""} trechos={trechos} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Repertórios sugeridos */}
                    {(() => {
                      const reps = (feedbackComp as any)?._repertorios as Array<{ tipo: string; titulo: string; descricao: string; como_usar: string }> | undefined;
                      if (!reps || reps.length === 0) return null;
                      return (
                        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-primary" />
                            <h3 className="font-heading text-base font-semibold">Repertórios para esse tema</h3>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Flora</Badge>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                            {reps.map((r, i) => (
                              <div key={i} className="space-y-1.5 rounded-xl border border-border bg-background/70 p-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{r.tipo}</Badge>
                                  <p className="text-sm font-semibold">{r.titulo}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{r.descricao}</p>
                                <p className="text-sm"><span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Como usar: </span>{r.como_usar}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Plano de estudo personalizado ── */}
                    {(() => {
                      const plano = metaObj?.plano_estudo as
                        | { diagnostico?: string[]; curto_prazo?: string[]; medio_prazo?: string[]; treino_direcionado?: string; dica_estrategica?: string }
                        | undefined;
                      if (!plano) return null;
                      const hasAny =
                        (plano.diagnostico?.length ?? 0) > 0 ||
                        (plano.curto_prazo?.length ?? 0) > 0 ||
                        (plano.medio_prazo?.length ?? 0) > 0 ||
                        plano.treino_direcionado ||
                        plano.dica_estrategica;
                      if (!hasAny) return null;
                      return (
                        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h3 className="font-heading text-base font-semibold">Plano de estudo personalizado</h3>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Flora</Badge>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {plano.diagnostico && plano.diagnostico.length > 0 && (
                              <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico</p>
                                </div>
                                <ul className="space-y-1 text-sm">
                                  {plano.diagnostico.map((d, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {plano.curto_prazo && plano.curto_prazo.length > 0 && (
                              <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-primary" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Curto prazo · 3–7 dias</p>
                                </div>
                                <ul className="space-y-1 text-sm">
                                  {plano.curto_prazo.map((d, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {plano.medio_prazo && plano.medio_prazo.length > 0 && (
                              <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
                                <div className="flex items-center gap-2">
                                  <CalendarRange className="h-4 w-4 text-primary" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médio prazo · 2 semanas</p>
                                </div>
                                <ul className="space-y-1 text-sm">
                                  {plano.medio_prazo.map((d, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {plano.treino_direcionado && (
                              <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="h-4 w-4 text-primary" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Treino direcionado</p>
                                </div>
                                <p className="text-sm">{plano.treino_direcionado}</p>
                              </div>
                            )}
                          </div>

                          {plano.dica_estrategica && (
                            <div className="flex gap-3 rounded-xl border border-primary/30 bg-background/60 p-3">
                              <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dica estratégica</p>
                                <p className="mt-1 text-sm italic">{plano.dica_estrategica}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Plano personalizado REAL (cruza redações, questões, sessões) ── */}
                    <div className="space-y-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          <h3 className="font-heading text-base font-semibold">Plano personalizado da Flora</h3>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Análise real</Badge>
                        </div>
                        <Button size="sm" onClick={generateRealPlan} disabled={loadingRealPlan}>
                          {loadingRealPlan ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando seus dados…</>) : (<><Sparkles className="mr-2 h-4 w-4" /> {realPlan ? "Atualizar" : "Gerar análise"}</>)}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A Flora analisa suas redações corrigidas, acertos em questões, horas estudadas por matéria e perfil do onboarding para montar um plano específico pra você.
                      </p>

                      {realPlanMetrics && (
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <div className="rounded-lg border border-border bg-background/70 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">Nota média</p>
                            <p className="text-lg font-bold">{realPlanMetrics.nota_media_redacao ?? "—"}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background/70 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">Evolução</p>
                            <p className={`text-lg font-bold ${realPlanMetrics.evolucao_pontos > 0 ? "text-emerald-600" : realPlanMetrics.evolucao_pontos < 0 ? "text-red-600" : ""}`}>
                              {realPlanMetrics.evolucao_pontos > 0 ? "+" : ""}{realPlanMetrics.evolucao_pontos}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background/70 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">Redações</p>
                            <p className="text-lg font-bold">{realPlanMetrics.total_redacoes}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background/70 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">Questões</p>
                            <p className="text-lg font-bold">{realPlanMetrics.total_questoes}</p>
                          </div>
                        </div>
                      )}

                      {realPlan && (
                        <Accordion type="multiple" defaultValue={["diag"]} className="space-y-2">
                          {realPlan.diagnostico?.length > 0 && (
                            <AccordionItem value="diag" className="rounded-xl border border-border bg-background/70 px-3">
                              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico</AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-1 text-sm">
                                  {realPlan.diagnostico.map((d: string, i: number) => (
                                    <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{d}</span></li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {(realPlan.pontos_fortes?.length > 0 || realPlan.pontos_criticos?.length > 0) && (
                            <AccordionItem value="pontos" className="rounded-xl border border-border bg-background/70 px-3">
                              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pontos fortes e críticos</AccordionTrigger>
                              <AccordionContent>
                                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                                  {realPlan.pontos_fortes?.length > 0 && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">Pontos fortes</p>
                                      <ul className="space-y-1 text-sm">
                                        {realPlan.pontos_fortes.map((p: string, i: number) => (<li key={i}>✓ {p}</li>))}
                                      </ul>
                                    </div>
                                  )}
                                  {realPlan.pontos_criticos?.length > 0 && (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Pontos críticos</p>
                                      <ul className="space-y-1 text-sm">
                                        {realPlan.pontos_criticos.map((p: string, i: number) => (<li key={i}>! {p}</li>))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {realPlan.dicas_redacao?.length > 0 && (
                            <AccordionItem value="dicas" className="rounded-xl border border-border bg-background/70 px-3">
                              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dicas pra sua redação</AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-1 text-sm">
                                  {realPlan.dicas_redacao.map((d: string, i: number) => (
                                    <li key={i} className="flex gap-2"><Lightbulb className="h-4 w-4 shrink-0 text-primary" /><span>{d}</span></li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {realPlan.plano_semanal?.length > 0 && (
                            <AccordionItem value="semana" className="rounded-xl border border-border bg-background/70 px-3">
                              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano da semana</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2">
                                  {realPlan.plano_semanal.map((d: any, i: number) => (
                                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2 text-sm">
                                      <Badge variant="secondary" className="text-[10px]">{d.dia}</Badge>
                                      <span className="font-medium">{d.foco}</span>
                                      <span className="text-muted-foreground">— {d.tarefa}</span>
                                      {d.duracao_min && <span className="ml-auto text-xs text-muted-foreground">{d.duracao_min} min</span>}
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {realPlan.metas_curto_prazo?.length > 0 && (
                            <AccordionItem value="metas" className="rounded-xl border border-primary/30 bg-primary/5 px-3">
                              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-primary">Metas dos próximos 7 dias</AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-1 text-sm">
                                  {realPlan.metas_curto_prazo.map((m: string, i: number) => (
                                    <li key={i} className="flex gap-2"><span className="text-primary font-bold">{i + 1}.</span>{m}</li>
                                  ))}
                                </ul>
                                {realPlan.indicador_acompanhamento && (
                                  <p className="mt-3 rounded-lg border border-primary/30 bg-background/60 p-2 text-sm italic">📊 {realPlan.indicador_acompanhamento}</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
