import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, ChevronLeft, Filter, ImageIcon,
  Loader2, RotateCcw, Search, Sparkles, Star, Timer, X, ChevronRight, ChevronDown, Maximize2, Minimize2, Type
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { MathText } from "@/components/MathText";
import { ShareExamResult } from "@/components/ShareExamResult";
import { getCachedExplanation, setCachedExplanation } from "@/lib/explainCache";
import { GenerateEnemQuestionsDialog } from "@/components/GenerateEnemQuestionsDialog";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { exportExamGabaritoPdf } from "@/lib/examPdfExport";
import { Download } from "lucide-react";

type Question = {
  id: string;
  ano: number | null;
  numero: number | null;
  area: string;
  disciplina: string;
  tema: string;
  enunciado: string;
  correta: string;
  imagem_urls: string[];
  alternativas: { letra: string; texto: string; imagem?: string | null }[];
  incomplete?: boolean;
};

type Attempt = { question_id: string; alternativa_marcada: string; acertou: boolean };
type Stat = { total: number; acertos: number };

// ─── Favoritos — persistidos no Supabase com fallback em localStorage ───────
const LS_FAVORITES_KEY = "banco-favorites-v1";

function loadFavoritesLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavoritesLocal(s: Set<string>) {
  try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(Array.from(s))); } catch { /* ignore */ }
}

async function loadFavoritesRemote(userId: string): Promise<Set<string>> {
  const { data } = await (supabase as any)
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();
  const ids: string[] = (data?.metadata as any)?.banco_favorites ?? [];
  return new Set(ids);
}

async function saveFavoritesRemote(userId: string, s: Set<string>): Promise<void> {
  // Persiste como campo no metadata do perfil para evitar criar tabela nova
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();
  const meta = typeof profile?.metadata === "object" && profile?.metadata !== null
    ? (profile.metadata as Record<string, unknown>)
    : {};
  await (supabase as any)
    .from("profiles")
    .update({ metadata: { ...meta, banco_favorites: Array.from(s) } } as any)
    .eq("id", userId);
}

const AREAS = ["Todas", "Linguagens", "Ciências Humanas", "Ciências da Natureza", "Matemática"];

function getAlternativas(q: Question) {
  return Array.isArray(q.alternativas) ? q.alternativas : [];
}

/**
 * Limpeza profunda de texto extraído de PDF do ENEM.
 * Remove artefatos comuns: caracteres de controle, símbolos Unicode inválidos,
 * espaços invisíveis, ligatures mal codificadas, marcadores de coluna dupla, etc.
 */
function cleanPdfArtifacts(raw: string): string {
  if (!raw) return "";
  let t = raw;

  // Remove marcadores [[placeholder]] que vazam do banco quando há imagem no enunciado
  t = t.replace(/\[\[placeholder\]\]/gi, "").trim();

  // Remove descrições textuais de imagem — o aluno deve interpretar a imagem sozinho.
  // Cobre padrões como: [Imagem: ...], (Imagem: ...), [Figura 1: ...], <Descrição da imagem: ...>,
  // "Descrição da imagem: ...\n", "Legenda: ...\n", etc.
  t = t.replace(/[\[\(<]\s*(?:imagem|figura|foto|ilustra[çc][ãa]o|gr[áa]fico|charge|tirinha|quadrinho|mapa|tabela|esquema|diagrama|descri[çc][ãa]o(?:\s+da\s+imagem)?|legenda)\b[^\]\)>]*[\]\)>]/gi, "");
  t = t.replace(/^\s*(?:descri[çc][ãa]o(?:\s+da\s+imagem)?|legenda(?:\s+da\s+imagem)?)\s*[:\-–][^\n]*\n?/gim, "");

  // Remove headings Markdown (## ## ###) que às vezes vazam do PDF
  t = t.replace(/^#{1,6}\s+/gm, "");

  // Normaliza quebras de linha
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove caracteres de controle exceto \n e \t
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Remove caracteres Unicode de uso privado (PUA) — lixo comum de fontes de PDF
  t = t.replace(/[\uE000-\uF8FF]/g, "");

  // Remove marcas de formatação Unicode invisíveis
  t = t.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, "");

  // Corrige ligatures tipográficas que não são reconhecidas
  t = t.replace(/\uFB00/g, "ff").replace(/\uFB01/g, "fi").replace(/\uFB02/g, "fl")
       .replace(/\uFB03/g, "ffi").replace(/\uFB04/g, "ffl");

  // Substitui aspas tipográficas por padrão
  t = t.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Corrige hifenização de fim de linha (palavras quebradas pelo PDF)
  t = t.replace(/(\w)-\n(\w)/g, "$1$2");

  // Colapsa espaços horizontais múltiplos
  t = t.replace(/[ \t]+/g, " ");

  // Remove espaço antes/depois de quebra de linha
  t = t.replace(/ *\n */g, "\n");

  // Colapsa 3+ quebras em parágrafo duplo
  t = t.replace(/\n{3,}/g, "\n\n");

  // Remove repetições adjacentes de frases (artefato de PDF 2 colunas)
  t = t.replace(/(\b.{20,80}?\b)\n?\s*\1/g, "$1");

  // Remove caixas de seleção e símbolos sem sentido isolados que não são LaTeX
  // (quadrados, círculos, triângulos soltos que vieram de fontes especiais)
  t = t.replace(/(?<!\$)[\u25A0-\u25FF](?!\$)/g, "□");

  return t.trim();
}

/**
 * Remove o bloco de alternativas A) B) C) D) E) que vazou para dentro do enunciado
 * quando as alternativas já vêm estruturadas em q.alternativas.
 * Só corta se realmente houver um bloco A..E sequencial — evita falso positivo
 * com frases narrativas tipo "A) proposta..." no meio do texto.
 */
function stripTrailingAlternativas(t: string): string {
  // Procura por A)...B)...C)...D)...E) (ou variações com . ) na cauda do texto.
  // Exige A,B,C,D,E em ordem dentro do trecho final pra ter certeza de que é bloco.
  const re = /\n\s*A\s*[).]\s[\s\S]+?\n\s*B\s*[).]\s[\s\S]+?\n\s*C\s*[).]\s[\s\S]+?\n\s*D\s*[).]\s[\s\S]+?\n\s*E\s*[).]\s/;
  const m = t.match(re);
  if (m && m.index !== undefined) {
    return t.slice(0, m.index).trimEnd();
  }
  return t;
}

function normalizeEnunciado(raw: string, hasStructuredAlts: boolean): string {
  let t = cleanPdfArtifacts(raw);
  if (hasStructuredAlts) {
    t = stripTrailingAlternativas(t);
  }
  return t;
}

function normalizeAlternativaTexto(raw: string): string {
  if (!raw) return "";
  let t = cleanPdfArtifacts(raw);
  // Remove "A) " duplicado no início (já exibimos a letra separado)
  t = t.replace(/^\s*[A-Ea-e]\s*[).]\s*/u, "");
  // Junta quebras internas de linha (alternativa deve ser 1 parágrafo)
  t = t.replace(/\n+/g, " ");
  // Numa alternativa nunca queremos blocos LaTeX em display ($$...$$ ou \[...\])
  // — convertemos pra inline pra evitar <div> dentro de <span>.
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_m, x) => `$${String(x).trim()}$`);
  t = t.replace(/\\\[([\s\S]+?)\\\]/g, (_m, x) => `\\(${String(x).trim()}\\)`);
  return t.trim();
}

/** Texto puro sem LaTeX para o preview do card (sem renderização KaTeX) */
function plainPreview(raw: string, hasStructuredAlts: boolean): string {
  const t = normalizeEnunciado(raw, hasStructuredAlts);
  // Remove delimitadores LaTeX para preview legível
  return t
    .replace(/\[\[placeholder\]\]/gi, "")
    .replace(/□/g, "")
    .replace(/\$\$([\s\S]+?)\$\$/g, "[fórmula]")
    .replace(/\\\[([\s\S]+?)\\\]/g, "[fórmula]")
    .replace(/\$([^\n$]+?)\$/g, "[fórmula]")
    .replace(/\\\(([\s\S]+?)\\\)/g, "[fórmula]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

// Sub-componente: imagens colapsáveis
function QuestionImages({ urls, label }: { urls: string[]; label: string }) {
  const [show, setShow] = useState(false);
  if (!urls?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setShow((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ImageIcon className="w-4 h-4 shrink-0" />
        <span className="font-medium">{show ? "Ocultar" : "Ver"} imagem da prova</span>
        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${show ? "rotate-90" : ""}`} />
      </button>
      {show && (
        <div className="border-t border-border bg-white dark:bg-zinc-900 p-3 space-y-3">
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${label} — imagem ${i + 1}`}
              className="w-full h-auto rounded-lg object-contain max-h-[420px]"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-componente: painel de alternativas
function AlternativasPanel({
  q,
  chosen,
  onAnswer,
  disabled,
}: {
  q: Question;
  chosen?: string;
  onAnswer: (letter: string) => void;
  disabled?: boolean;
}) {
  const alts = getAlternativas(q);
  const letters = ["A", "B", "C", "D", "E"];

  if (alts.length === 5) {
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
              disabled={!!chosen || disabled}
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
                isCorrect
                  ? "bg-emerald-500 text-white"
                  : isWrong
                  ? "bg-destructive text-destructive-foreground"
                  : isChosen
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>{alt.letra}</span>
              <div className="flex-1 min-w-0 space-y-2">
                {alt.texto && (
                  <MathText className="text-sm leading-relaxed" inline>
                    {normalizeAlternativaTexto(alt.texto)}
                  </MathText>
                )}
                {alt.imagem && (
                  <img
                    src={alt.imagem}
                    alt={`Alternativa ${alt.letra}`}
                    className="rounded-lg border border-border bg-white dark:bg-zinc-900 max-h-48 object-contain"
                  />
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

  return (
    <div className="grid grid-cols-5 gap-2">
      {letters.map((letter) => {
        const isCorrect = !!chosen && letter === q.correta;
        const isWrong = chosen === letter && letter !== q.correta;
        return (
          <Button
            key={letter}
            variant={chosen ? (isCorrect ? "default" : isWrong ? "destructive" : "outline") : "outline"}
            className="h-11 text-base font-semibold rounded-xl"
            onClick={() => onAnswer(letter)}
            disabled={!!chosen || disabled}
          >{letter}</Button>
        );
      })}
    </div>
  );
}

export default function BancoQuestoes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") ?? "");
  const [area, setArea] = useState("Todas");
  const [ano, setAno] = useState("Todos");
  const [disciplina, setDisciplina] = useState(() => searchParams.get("disciplina") ?? "Todas");
  const [tema, setTema] = useState<string>("Todos");
  const [opened, setOpened] = useState<Question | null>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [readingFont, setReadingFont] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem("banco.readingFont") || "1");
    return Number.isFinite(v) && v >= 0.85 && v <= 1.4 ? v : 1;
  });
  const [readingLead, setReadingLead] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem("banco.readingLead") || "1");
    return Number.isFinite(v) && v >= 0.9 && v <= 1.2 ? v : 1;
  });
  useEffect(() => { try { localStorage.setItem("banco.readingFont", String(readingFont)); } catch { /* ignore */ } }, [readingFont]);
  useEffect(() => { try { localStorage.setItem("banco.readingLead", String(readingLead)); } catch { /* ignore */ } }, [readingLead]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [examQueue, setExamQueue] = useState<Question[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const [examElapsed, setExamElapsed] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  type ExamKind = "quick" | "day1" | "day2";
  const [examKind, setExamKind] = useState<ExamKind>("quick");
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [examYear, setExamYear] = useState<string>("mix"); // "mix" | "2024" | ...
  const [examYearOpen, setExamYearOpen] = useState(false);
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavoritesLocal());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [globalStats, setGlobalStats] = useState<Record<string, Stat>>({});

  useEffect(() => {
    (async () => {
      // Paginar para trazer TODAS as questões (Supabase limita 1000 por request)
      const PAGE = 1000;
      const fetchAllQuestions = async () => {
        const all: any[] = [];
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from("questions")
            .select("id,ano,numero,area,disciplina,tema,enunciado,correta,imagem_urls,alternativas,incomplete")
            .order("ano", { ascending: false })
            .order("numero", { ascending: true })
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < PAGE) break;
        }
        return all;
      };

      let questionsData: any[] = [];
      let loadError: any = null;
      try {
        questionsData = await fetchAllQuestions();
      } catch (e) {
        loadError = e;
      }
      const { data: attemptsData } = await supabase
        .from("question_attempts")
        .select("question_id,alternativa_marcada,acertou")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (loadError) toast.error("Erro ao carregar questões");
      else {
        // Deduplica por id (banco pode ter espelhamento de cadernos)
        const seen = new Set<string>();
        const unique = (questionsData as Question[]).filter((q) => {
          if (seen.has(q.id)) return false;
          seen.add(q.id);
          return true;
        });
        setQuestions(unique);
      }
      const map: Record<string, Attempt> = {};
      (attemptsData || []).forEach((a: any) => {
        if (!map[a.question_id]) map[a.question_id] = a as Attempt;
      });
      setAttempts(map);
      setLoading(false);

      // Estatísticas globais (não-bloqueante)
      (supabase.rpc as any)("question_stats").then(({ data: sData }: any) => {
        if (!sData) return;
        const sMap: Record<string, Stat> = {};
        (sData as Array<{ question_id: string; total: number; acertos: number }>).forEach((r) => {
          sMap[r.question_id] = { total: Number(r.total), acertos: Number(r.acertos) };
        });
        setGlobalStats(sMap);
      });
    })();
  }, []);

  // Carrega favoritos do Supabase na primeira abertura (sobrescreve localStorage)
  useEffect(() => {
    if (!user || favoritesLoaded) return;
    loadFavoritesRemote(user.id).then((remote) => {
      if (remote.size > 0) {
        setFavorites(remote);
        saveFavoritesLocal(remote);
      }
      setFavoritesLoaded(true);
    }).catch(() => { setFavoritesLoaded(true); }); // fallback silencioso
  }, [user, favoritesLoaded]);

  // Persiste favoritos — localStorage imediato + Supabase assíncrono
  useEffect(() => {
    saveFavoritesLocal(favorites);
    if (user && favoritesLoaded) {
      saveFavoritesRemote(user.id, favorites).catch(() => { /* falha silenciosa */ });
    }
  }, [favorites, user, favoritesLoaded]);
  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Debounce do campo de busca: filtro só roda 300ms depois da última tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const disciplinas = useMemo(() => {
    // Remove valores que são na verdade áreas (evita duplicação com o filtro "Área").
    const AREA_LIKE = new Set([
      "Linguagens",
      "Ciências Humanas",
      "Ciências da Natureza",
      "Humanas",
      "Natureza",
      "Matemática",
    ]);
    const set = new Set(
      questions
        .map((q) => q.disciplina)
        .filter((d) => d && !AREA_LIKE.has(d)),
    );
    return ["Todas", ...Array.from(set).sort()];
  }, [questions]);

  // Temas disponíveis dependem da disciplina selecionada (ou de todas).
  const temas = useMemo(() => {
    const set = new Set<string>();
    const isFilteredByDisc = disciplina !== "Todas";
    const isFilteredByArea = area !== "Todas";

    for (const q of questions) {
      // Se tiver área selecionada, filtra por ela
      if (isFilteredByArea && q.area !== area) continue;
      // Se tiver disciplina selecionada, filtra por ela
      if (isFilteredByDisc && q.disciplina !== disciplina) continue;
      
      const t = (q.tema || "").trim();
      if (t) set.add(t);
    }
    return ["Todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [questions, disciplina, area]);

  // Pré-computa enunciado limpo, preview e haystack de busca por questão.
  // Evita rodar cleanPdfArtifacts toda hora durante render/filter.
  const cleanedById = useMemo(() => {
    const map = new Map<
      string,
      { cleaned: string; preview: string; haystack: string; tema: string }
    >();
    for (const q of questions) {
      const hasAlts = getAlternativas(q).length === 5;
      const cleaned = normalizeEnunciado(q.enunciado, hasAlts);
      const preview = plainPreview(q.enunciado, hasAlts);
      const tema = (q.tema || "").toLowerCase();
      // Haystack = texto sem LaTeX e sem lixo, em minúsculas, pra busca confiável.
      const haystack = (
        cleaned
          .replace(/\$\$([\s\S]+?)\$\$/g, " ")
          .replace(/\\\[([\s\S]+?)\\\]/g, " ")
          .replace(/\$([^\n$]+?)\$/g, " ")
          .replace(/\\\(([\s\S]+?)\\\)/g, " ") +
        " " +
        tema
      ).toLowerCase();
      map.set(q.id, { cleaned, preview, haystack, tema });
    }
    return map;
  }, [questions]);

  // Lista de anos gerada dinamicamente a partir do banco
  const anos = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      if (q.ano != null) set.add(String(q.ano));
    }
    return ["Todos", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [questions]);

  // Fecha o modal de forma segura: pede confirmação se houver explicação não revisada.
  function closeModal() {
    if (explanation && !confirm("Fechar e descartar a explicação da Flora?")) return;
    setOpened(null);
    setExplanation("");
    setReadingMode(false);
  }

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    return questions.filter((q) => {
      if (area !== "Todas" && q.area !== area) return false;
      if (ano !== "Todos" && String(q.ano) !== ano) return false;
      if (disciplina !== "Todas" && q.disciplina !== disciplina) return false;
      if (tema !== "Todos" && (q.tema || "").trim() !== tema) return false;
      if (s) {
        const hay = cleanedById.get(q.id)?.haystack ?? "";
        if (!hay.includes(s)) return false;
      }
      if (onlyErrors && attempts[q.id]?.acertou !== false) return false;
      if (onlyFavorites && !favorites.has(q.id)) return false;
      if (q.incomplete && !showIncomplete) return false;
      return true;
    });
  }, [questions, debouncedSearch, area, ano, disciplina, tema, onlyErrors, onlyFavorites, showIncomplete, favorites, attempts, cleanedById]);

  // Índice da questão aberta dentro da lista filtrada → navegação ←/→.
  const openedIndex = useMemo(
    () => (opened ? filtered.findIndex((q) => q.id === opened.id) : -1),
    [opened, filtered],
  );
  function navigateModal(dir: -1 | 1) {
    if (openedIndex < 0) return;
    const next = filtered[openedIndex + dir];
    if (!next) return;
    setOpened(next);
    setExplanation("");
  }

  // Atalhos de teclado do modal: ESC fecha, ←/→ navega.
  useEffect(() => {
    if (!opened || examMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      else if (e.key === "ArrowLeft") navigateModal(-1);
      else if (e.key === "ArrowRight") navigateModal(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, examMode, openedIndex, filtered, explanation]);

  const stats = useMemo(() => {
    const arr = Object.values(attempts);
    return { total: arr.length, acertos: arr.filter((a) => a.acertou).length, erros: arr.filter((a) => !a.acertou).length };
  }, [attempts]);

  async function recordAttempt(q: Question, letter: string, modo: "livre" | "prova" | "revisao") {
    const acertou = letter === q.correta;
    setAttempts((p) => ({ ...p, [q.id]: { question_id: q.id, alternativa_marcada: letter, acertou } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("question_attempts").insert({ user_id: user.id, question_id: q.id, alternativa_marcada: letter, acertou, modo });
  }

  function handleAnswer(q: Question, letter: string) {
    if (revealed[q.id]) return;
    setRevealed((r) => ({ ...r, [q.id]: letter }));
    recordAttempt(q, letter, "livre");
  }

  async function explainWithFlora(q: Question) {
    if (!q) return;
    setExplaining(true);
    setExplanation("");
    const altMarcada = revealed[q.id] || attempts[q.id]?.alternativa_marcada || "";
    // Cache local: evita chamada à IA quando reabrimos a mesma questão
    const cached = getCachedExplanation(q.id, altMarcada);
    if (cached) {
      setExplanation(cached);
      setExplaining(false);
      return;
    }
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-question`;
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { 
        toast.error("Faça login para usar a Flora"); 
        setExplaining(false); 
        return; 
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          enunciado: q.enunciado, 
          alternativaMarcada: altMarcada, 
          correta: q.correta, 
          ano: q.ano, 
          numero: q.numero, 
          disciplina: q.disciplina, 
          tema: q.tema 
        }),
      });

      if (resp.status === 429) { 
        toast.error("Muitas requisições. Aguarde."); 
        setExplaining(false); 
        return; 
      }
      if (resp.status === 402) { 
        toast.error("Créditos da IA esgotados."); 
        setExplaining(false); 
        return; 
      }
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      if (!resp.body) { 
        toast.error("Erro ao gerar explicação"); 
        setExplaining(false); 
        return; 
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let acc = "";
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { 
            done = true; 
            break; 
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { 
              acc += c; 
              setExplanation((prev) => prev + c); 
            }
          } catch (err) { 
            console.error("Erro ao processar chunk:", err);
            // Tenta manter o buffer se for erro de parse parcial
          }
        }
      }
      // Persiste no cache local após o stream
      if (acc.trim()) setCachedExplanation(q.id, altMarcada, acc);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com Flora");
    } finally {
      setExplaining(false);
    }
  }

  // Mapeamento ENEM oficial: disciplina → área da prova
  const DAY1_LINGUAGENS = new Set([
    "linguagens", "português", "literatura", "inglês", "espanhol",
    "artes", "educação física"
  ]);
  const DAY1_HUMANAS = new Set([
    "humanas", "ciências humanas", "história", "geografia", "filosofia", "sociologia"
  ]);
  const DAY2_MATEMATICA = new Set(["matemática"]);
  const DAY2_NATUREZA = new Set([
    "natureza", "ciências da natureza", "biologia", "química", "física"
  ]);

  function norm(s: string) { return (s || "").toLowerCase().trim(); }

  function pickBalanced(pool: Question[], groups: Set<string>[], perGroup: number): Question[] {
    const out: Question[] = [];
    for (const g of groups) {
      const inGroup = pool.filter((q) => g.has(norm(q.disciplina)));
      const shuffled = [...inGroup].sort(() => Math.random() - 0.5).slice(0, perGroup);
      out.push(...shuffled);
      // Se faltarem questões nesse grupo, completa com aleatórias quaisquer
      if (shuffled.length < perGroup) {
        const remaining = pool.filter((q) => !out.includes(q));
        const extra = [...remaining].sort(() => Math.random() - 0.5).slice(0, perGroup - shuffled.length);
        out.push(...extra);
      }
    }
    return out;
  }

  function startExam(kind: ExamKind = "quick") {
    setShowExamPicker(false);
    setExamKind(kind);
    const yearPool = examYear === "mix"
      ? questions
      : questions.filter((q) => String(q.ano) === examYear);
    let queue: Question[] = [];
    if (kind === "quick") {
      const pool = examYear === "mix"
        ? (filtered.length >= 10 ? filtered : questions)
        : yearPool;
      queue = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    } else if (kind === "day1") {
      queue = pickBalanced(yearPool, [DAY1_LINGUAGENS, DAY1_HUMANAS], 45);
    } else {
      queue = pickBalanced(yearPool, [DAY2_MATEMATICA, DAY2_NATUREZA], 45);
    }
    if (queue.length === 0) {
      toast.error("Nenhuma questão disponível para este simulado.");
      return;
    }
    setExamQueue(queue);
    setExamAnswers({});
    setExamIndex(0);
    setExamStartedAt(Date.now());
    setExamElapsed(0);
    setExamFinished(false);
    setExamMode(true);
  }

  useEffect(() => {
    if (!examMode || examFinished || !examStartedAt) return;
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - examStartedAt) / 1000);
      setExamElapsed(elapsed);
      const limit = examKind === "day1" ? 5 * 3600 + 30 * 60 : examKind === "day2" ? 5 * 3600 : null;
      if (limit && elapsed >= limit) {
        setExamFinished(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [examMode, examFinished, examStartedAt, examKind]);

  function answerExam(letter: string) {
    const q = examQueue[examIndex];
    if (!q || examAnswers[q.id]) return;
    setExamAnswers((a) => ({ ...a, [q.id]: letter }));
    recordAttempt(q, letter, "prova");
  }

  function nextExam() {
    if (examIndex < examQueue.length - 1) setExamIndex((i) => i + 1);
    else setExamFinished(true);
  }

  function closeExam() {
    setExamMode(false);
    setExamFinished(false);
    setExamQueue([]);
    setExamAnswers({});
    setExamStartedAt(null);
  }

  const examScore = useMemo(() => {
    let acertos = 0;
    examQueue.forEach((q) => { if (examAnswers[q.id] === q.correta) acertos++; });
    return acertos;
  }, [examQueue, examAnswers]);

  const pct = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-6">

      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-b from-card via-card to-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary/80 ring-2 ring-card" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-heading font-semibold leading-tight tracking-tight">Banco de Questões</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary/70" />
              {questions.length} questões oficiais do ENEM
            </p>
          </div>
          <GenerateEnemQuestionsDialog
            defaultDisciplina={disciplina !== "Todas" ? disciplina : undefined}
          />
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* Simular prova */}
        <Button
          size="sm"
          onClick={() => setShowExamPicker(true)}
          className="h-9 px-4 text-xs"
        >
          <Timer className="w-3.5 h-3.5 mr-1.5" /> Simular prova
        </Button>

        {/* Filtros */}
        <Card className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar por enunciado ou tema…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {anos && anos.length > 0 ? (
                  anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)
                ) : (
                  <SelectItem value="Todos">Todos</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={area} onValueChange={(v) => { setArea(v); setDisciplina("Todas"); setTema("Todos"); }}>
              <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                {AREAS && AREAS.length > 0 ? (
                  AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)
                ) : (
                  <SelectItem value="Todas">Todas</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={disciplina} onValueChange={(v) => { setDisciplina(v); setTema("Todos"); }}>
              <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
              <SelectContent>
                {disciplinas && disciplinas.length > 0 ? (
                  disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)
                ) : (
                  <SelectItem value="Todas">Todas</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={tema} onValueChange={setTema}>
              <SelectTrigger><SelectValue placeholder="Tema" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="Todos">Todos os Temas</SelectItem>
                {temas && temas.length > 0 ? (
                  temas.filter(t => t !== "Todos").map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>{filtered.length} resultado{filtered.length !== 1 && "s"}</span>
            {onlyErrors && <Badge variant="destructive" className="ml-1">só erros</Badge>}
            {onlyFavorites && <Badge variant="secondary" className="ml-1">só favoritas</Badge>}
            {showIncomplete && <Badge variant="outline" className="ml-1 border-amber-500/50 text-amber-600">incluindo incompletas</Badge>}
            <Button
              size="sm"
              variant={onlyFavorites ? "default" : "ghost"}
              className="ml-auto h-7 px-2 text-xs"
              onClick={() => setOnlyFavorites((v) => !v)}
              aria-pressed={onlyFavorites}
            >
              <Star className={`w-3.5 h-3.5 mr-1 ${onlyFavorites ? "fill-current" : ""}`} />
              Favoritas ({favorites.size})
            </Button>
            <Button
              size="sm"
              variant={showIncomplete ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setShowIncomplete((v) => !v)}
              aria-pressed={showIncomplete}
              title="Mostrar questões marcadas como incompletas"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Incompletas
            </Button>
          </div>
        </Card>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.slice(0, 200).map((q) => {
              const att = attempts[q.id];
              const hasImg = !!q.imagem_urls?.[0];
              const enunciado = cleanedById.get(q.id)?.preview ?? "";
              const stat = globalStats[q.id];
              const erroPct = stat && stat.total > 0 ? Math.round(((stat.total - stat.acertos) / stat.total) * 100) : null;
              const isFav = favorites.has(q.id);
              const ariaLabel = `Questão ${q.numero ?? "?"} do ENEM ${q.ano ?? ""}, ${q.disciplina || "sem disciplina"}${att ? (att.acertou ? ", já acertou" : ", já errou") : ""}${isFav ? ", favorita" : ""}`;
              return (
                <button
                  key={q.id}
                  onClick={() => { setOpened(q); setExplanation(""); }}
                  className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                  aria-label={ariaLabel}
                >
                  <Card className={`p-4 hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col gap-3 relative overflow-hidden ${
                    att?.acertou ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.05] to-transparent" : att && !att.acertou ? "border-destructive/40 bg-gradient-to-br from-destructive/[0.05] to-transparent" : "group-hover:bg-gradient-to-br group-hover:from-primary/[0.03] group-hover:to-transparent"
                  }`}>
                    <span className={`absolute inset-x-0 top-0 h-0.5 ${att?.acertou ? "bg-emerald-500/70" : att ? "bg-destructive/70" : "bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"}`} />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[11px] px-2 py-0.5">ENEM {q.ano}</Badge>
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5">Q{q.numero}</Badge>
                      {q.disciplina && (
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 truncate max-w-[120px]">{q.disciplina}</Badge>
                      )}
                      {q.incomplete && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> incompleta
                        </Badge>
                      )}
                      {att && (
                        <span className={`ml-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${att.acertou ? "bg-emerald-500" : "bg-destructive"}`}>
                          {att.acertou ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/85 line-clamp-4 leading-relaxed flex-1">
                      {enunciado ? (
                        <>{enunciado}{enunciado.length >= 240 ? "…" : ""}</>
                      ) : (
                        <span className="text-muted-foreground italic flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" /> Questão com imagem
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-auto pt-1 border-t border-border/50">
                      {hasImg && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> imagem</span>}
                      {erroPct != null && (
                        <span
                          className={`flex items-center gap-1 ${erroPct >= 60 ? "text-destructive" : erroPct >= 30 ? "text-amber-500" : "text-emerald-600"}`}
                          title={`${stat.total} respostas no total`}
                        >
                          {erroPct}% erram
                        </span>
                      )}
                      <span className="ml-auto text-primary/70 group-hover:text-primary font-medium transition-colors">Ver questão →</span>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
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
          className={`fixed inset-0 z-50 overflow-y-auto ${
            readingMode
              ? "bg-background"
              : "bg-black/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6"
          }`}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-modal-title"
        >
          <div
            className={
              readingMode
                ? "w-full min-h-full bg-background"
                : "max-w-2xl w-full my-4 sm:my-8 rounded-2xl border border-border bg-card shadow-2xl"
            }
            onClick={(e) => e.stopPropagation()}
            style={readingMode ? ({ ["--reading-scale" as any]: readingFont, ["--reading-leading" as any]: readingLead }) : undefined}
          >
            {/* Cabeçalho */}
            <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-card/95 backdrop-blur ${
              readingMode ? "sticky top-0 z-20" : "bg-muted/40"
            }`}>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Badge variant="secondary" id="question-modal-title">ENEM {opened.ano} · Q{opened.numero}</Badge>
                {opened.disciplina && <Badge variant="outline">{opened.disciplina}</Badge>}
                {opened.tema && (
                  <span className="text-xs text-muted-foreground truncate max-w-full sm:max-w-[200px] basis-full sm:basis-auto">
                    {opened.tema}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 -mr-1">
                <Button
                  variant={readingMode ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full h-8 px-3 gap-1.5 hidden sm:inline-flex"
                  onClick={() => setReadingMode((v) => !v)}
                  title={readingMode ? "Sair do modo leitura" : "Modo leitura — tela cheia, sem scroll interno"}
                >
                  {readingMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="text-xs font-medium">{readingMode ? "Sair" : "Foco"}</span>
                </Button>
                {readingMode && (
                  <div className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setReadingFont((v) => Math.max(0.85, +(v - 0.05).toFixed(2)))}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full text-xs font-semibold hover:bg-muted disabled:opacity-40"
                      disabled={readingFont <= 0.85}
                      aria-label="Diminuir fonte"
                      title="Diminuir fonte"
                    >A−</button>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-center">{Math.round(readingFont * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setReadingFont((v) => Math.min(1.4, +(v + 0.05).toFixed(2)))}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-full text-xs font-semibold hover:bg-muted disabled:opacity-40"
                      disabled={readingFont >= 1.4}
                      aria-label="Aumentar fonte"
                      title="Aumentar fonte"
                    >A+</button>
                    <span className="w-px h-4 bg-border mx-0.5" />
                    <button
                      type="button"
                      onClick={() => setReadingLead((v) => (v >= 1.2 ? 0.9 : +(v + 0.1).toFixed(2)))}
                      className="h-7 inline-flex items-center justify-center px-2 rounded-full hover:bg-muted"
                      aria-label="Ajustar espaçamento entre linhas"
                      title={`Espaçamento (atual ${Math.round(readingLead * 100)}%) — clique para alternar`}
                    >
                      <Type className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full sm:hidden"
                  onClick={() => setReadingMode((v) => !v)}
                  title={readingMode ? "Sair do modo leitura" : "Modo leitura"}
                  aria-label={readingMode ? "Sair do modo leitura" : "Modo leitura"}
                >
                  {readingMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <span className="hidden sm:block w-px h-5 bg-border mx-0.5" aria-hidden />
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full ${favorites.has(opened.id) ? "text-amber-500" : ""}`}
                  onClick={() => toggleFavorite(opened.id)}
                  title={favorites.has(opened.id) ? "Remover dos favoritos" : "Favoritar"}
                  aria-label={favorites.has(opened.id) ? "Remover dos favoritos" : "Favoritar"}
                  aria-pressed={favorites.has(opened.id)}
                >
                  <Star className={`w-4 h-4 ${favorites.has(opened.id) ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => navigateModal(-1)}
                  disabled={openedIndex <= 0}
                  title="Anterior (←)"
                  aria-label="Questão anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[11px] text-muted-foreground tabular-nums px-1">
                  {openedIndex >= 0 ? `${openedIndex + 1}/${filtered.length}` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => navigateModal(1)}
                  disabled={openedIndex < 0 || openedIndex >= filtered.length - 1}
                  title="Próxima (→)"
                  aria-label="Próxima questão"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={closeModal} title="Fechar (Esc)" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Corpo */}
            <div className={`space-y-8 sm:space-y-10 ${readingMode ? "px-4 sm:px-8 py-8 sm:py-12" : "px-5 sm:px-7 py-6 sm:py-8"}`}>

              {/* Aviso de incompleta */}
              {opened.incomplete && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Questão marcada como incompleta</p>
                    <p className="text-xs text-foreground/70 mt-0.5">
                      Esta questão pode ter alternativas faltando, enunciado quebrado ou outro problema de extração. Use com cautela ou pule para a próxima.
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Texto de apoio + imagens + enunciado (renderizador hierárquico) */}
              <QuestionRenderer
                enunciado={cleanedById.get(opened.id)?.cleaned ?? normalizeEnunciado(opened.enunciado, getAlternativas(opened).length === 5)}
                imagens={opened.imagem_urls || []}
                label={`Questão ${opened.numero} ENEM ${opened.ano}`}
                wide={readingMode}
              />

              {/* 3. Alternativas */}
              <section id="q-alternativas" className={`scroll-mt-20 mx-auto w-full ${readingMode ? "max-w-3xl" : "max-w-[680px]"}`}>
                <header className="flex items-center gap-2 mb-4">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Alternativas</span>
                  <span className="h-px flex-1 bg-border" />
                </header>
                <AlternativasPanel
                  q={opened}
                  chosen={revealed[opened.id] || attempts[opened.id]?.alternativa_marcada}
                  onAnswer={(letter) => handleAnswer(opened, letter)}
                />
              </section>

              {/* 4. Resultado */}
              {(opened && (revealed[opened.id] || attempts[opened.id])) && (() => {
                const chosen = revealed[opened.id] || attempts[opened.id]?.alternativa_marcada;
                const acertou = chosen === opened.correta;
                return (
                  <div className={`mx-auto w-full ${readingMode ? "max-w-3xl" : "max-w-[680px]"} rounded-xl px-4 py-3 flex items-center gap-3 ${acertou ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${acertou ? "bg-emerald-500" : "bg-destructive"}`}>
                      {acertou ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                    </span>
                    <p className={`text-sm font-medium ${acertou ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                      {acertou ? "Correto! Resposta: " : "Resposta correta: "}
                      <span className="font-bold">{opened.correta}</span>
                    </p>
                  </div>
                );
              })()}

              {/* 5. Flora explica */}
              <div className={`mx-auto w-full ${readingMode ? "max-w-3xl" : "max-w-[680px]"} flex flex-wrap gap-2`}>
                <Button variant="secondary" size="sm" onClick={() => explainWithFlora(opened)} disabled={explaining}>
                  {explaining ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  Flora explica
                </Button>
              </div>

              {(explanation || explaining) && (
                <div className={`mx-auto w-full ${readingMode ? "max-w-3xl" : "max-w-[680px]"} rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2`}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> Flora
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {explanation || "Pensando…"}
                    {explaining && <span className="inline-block w-2 h-[1em] ml-1 bg-primary/60 animate-pulse align-middle rounded-sm" />}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Picker de tipo de simulado */}
      {showExamPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExamPicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-semibold tracking-tight">Simular prova</h3>
              {stats.total > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {Math.round((stats.erros / stats.total) * 100)}% de erros
                </span>
              )}
            </div>

            {/* Refazer erros */}
            <button
              type="button"
              onClick={() => stats.erros > 0 && setOnlyErrors((v) => !v)}
              disabled={stats.erros === 0}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                onlyErrors
                  ? "bg-primary/10 border-primary/40"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <RotateCcw className="w-3 h-3" />
                Refazer erros
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {stats.erros}
              </span>
            </button>

            {/* Ano (expandable) */}
            <div className="relative rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setExamYearOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <span className="text-xs font-medium">Ano</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {examYear === "mix" ? "Misturar" : examYear}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${examYearOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              {examYearOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg divide-y divide-border">
                  <button
                    type="button"
                    onClick={() => { setExamYear("mix"); setExamYearOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                      examYear === "mix"
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    Misturar
                  </button>
                  {anos.filter((a) => a !== "Todos").map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setExamYear(a); setExamYearOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-xs font-medium tabular-nums transition-colors ${
                        examYear === a
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Modo</label>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {[
                  { kind: "quick" as const, title: "Rápido", meta: "10 questões" },
                  { kind: "day1" as const, title: "Dia 1", meta: "90q · 5h30 · Linguagens + Humanas" },
                  { kind: "day2" as const, title: "Dia 2", meta: "90q · 5h00 · Matemática + Natureza" },
                ].map((o) => (
                  <button
                    key={o.kind}
                    type="button"
                    onClick={() => startExam(o.kind)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{o.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{o.meta}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowExamPicker(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  {examKind === "day1" && "Prova ENEM · Dia 1 (Linguagens + Humanas)"}
                  {examKind === "day2" && "Prova ENEM · Dia 2 (Matemática + Natureza)"}
                  {examKind === "quick" && "Simulado rápido · 10 questões"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Questão {Math.min(examIndex + 1, examQueue.length)} de {examQueue.length}
                  {" · "}
                  {(() => {
                    const limit = examKind === "day1" ? 5 * 3600 + 30 * 60 : examKind === "day2" ? 5 * 3600 : null;
                    if (limit) {
                      const remaining = Math.max(0, limit - examElapsed);
                      const h = Math.floor(remaining / 3600);
                      const m = Math.floor((remaining % 3600) / 60);
                      const s = remaining % 60;
                      return <>Restam {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</>;
                    }
                    return <>{String(Math.floor(examElapsed / 60)).padStart(2, "0")}:{String(examElapsed % 60).padStart(2, "0")}</>;
                  })()}
                </p>
              </div>
              {examQueue.length <= 15 ? (
                <div className="hidden sm:flex gap-1 items-center">
                  {examQueue.map((q, i) => (
                    <div key={q.id} className={`h-1.5 w-5 rounded-full transition-colors ${
                      i < examIndex
                        ? examAnswers[q.id] === q.correta ? "bg-emerald-500" : "bg-destructive"
                        : i === examIndex ? "bg-primary" : "bg-muted"
                    }`} />
                  ))}
                </div>
              ) : (
                <div className="hidden sm:flex items-center w-32">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(examIndex / Math.max(1, examQueue.length - 1)) * 100}%` }} />
                  </div>
                </div>
              )}
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
                    <Badge variant="secondary">ENEM {q.ano}</Badge>
                    <Badge variant="outline">Q{q.numero}</Badge>
                    <Badge variant="outline">{q.disciplina}</Badge>
                  </div>

                  {/* Texto de apoio + imagens + enunciado */}
                  <QuestionRenderer
                    enunciado={cleanedById.get(q.id)?.cleaned ?? normalizeEnunciado(q.enunciado, getAlternativas(q).length === 5)}
                    imagens={q.imagem_urls || []}
                    label={`Questão ${q.numero} ENEM ${q.ano}`}
                  />

                  {/* Alternativas */}
                  <AlternativasPanel q={q} chosen={chosen} onAnswer={answerExam} />

                  {/* Resultado */}
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
                {/* Desempenho por área */}
                {(() => {
                  const byArea: Record<string, { acertos: number; total: number }> = {};
                  examQueue.forEach((q) => {
                    const k = q.disciplina || "Outras";
                    if (!byArea[k]) byArea[k] = { acertos: 0, total: 0 };
                    byArea[k].total++;
                    if (examAnswers[q.id] === q.correta) byArea[k].acertos++;
                  });
                  const rows = Object.entries(byArea).sort((a, b) => b[1].total - a[1].total);
                  if (rows.length === 0) return null;
                  return (
                    <div className="mx-auto max-w-md w-full text-left rounded-xl border border-border bg-card/60 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desempenho por área</p>
                      {rows.map(([area, s]) => {
                        const pct = s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0;
                        return (
                          <div key={area} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{area}</span>
                              <span className="tabular-nums text-muted-foreground">{s.acertos}/{s.total} · {pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Gabarito */}
                <details className="mx-auto max-w-md w-full text-left rounded-xl border border-border bg-card/60">
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">Ver gabarito completo</summary>
                  <div className="px-4 pb-4 max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 font-medium">Q</th>
                          <th className="text-left py-1.5 font-medium">Disciplina</th>
                          <th className="text-center py-1.5 font-medium">Sua</th>
                          <th className="text-center py-1.5 font-medium">Gab.</th>
                          <th className="text-center py-1.5 font-medium">✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examQueue.map((q, i) => {
                          const marcada = examAnswers[q.id];
                          const acertou = marcada === q.correta;
                          return (
                            <tr key={q.id} className="border-b border-border/40 last:border-0">
                              <td className="py-1.5 tabular-nums">{q.numero ?? i + 1}</td>
                              <td className="py-1.5 truncate max-w-[120px]">{q.disciplina}</td>
                              <td className="py-1.5 text-center font-mono">{marcada || "—"}</td>
                              <td className="py-1.5 text-center font-mono font-semibold">{q.correta}</td>
                              <td className={`py-1.5 text-center ${acertou ? "text-emerald-600" : marcada ? "text-destructive" : "text-muted-foreground"}`}>
                                {acertou ? "✓" : marcada ? "✗" : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>

                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const byArea: Record<string, { acertos: number; total: number }> = {};
                      examQueue.forEach((q) => {
                        const k = q.disciplina || "Outras";
                        if (!byArea[k]) byArea[k] = { acertos: 0, total: 0 };
                        byArea[k].total++;
                        if (examAnswers[q.id] === q.correta) byArea[k].acertos++;
                      });
                      const titulo =
                        examKind === "day1" ? "Prova ENEM - Dia 1" :
                        examKind === "day2" ? "Prova ENEM - Dia 2" :
                        "Simulado rapido ENEM";
                      exportExamGabaritoPdf({
                        titulo,
                        geradoEm: new Date(),
                        duracaoSegundos: examElapsed,
                        total: examQueue.length,
                        acertos: examScore,
                        porArea: Object.entries(byArea).map(([area, s]) => ({ area, ...s })),
                        linhas: examQueue.map((q, i) => ({
                          numero: q.numero ?? i + 1,
                          ano: q.ano,
                          disciplina: q.disciplina,
                          marcada: examAnswers[q.id] ?? null,
                          correta: q.correta,
                          acertou: examAnswers[q.id] === q.correta,
                        })),
                      }).catch(() => toast.error("Erro ao gerar PDF"));
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Baixar PDF
                  </Button>
                  <Button variant="outline" onClick={() => setShowExamPicker(true)}><Timer className="w-4 h-4 mr-1.5" /> Novo simulado</Button>
                  <Button onClick={closeExam}>Voltar ao banco</Button>
                </div>
                <div className="pt-2">
                  <ShareExamResult
                    score={examScore}
                    total={examQueue.length}
                    elapsedSeconds={examElapsed}
                    disciplina={disciplina !== "Todas" ? disciplina : undefined}
                    ano={ano !== "Todos" ? Number(ano) : undefined}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
