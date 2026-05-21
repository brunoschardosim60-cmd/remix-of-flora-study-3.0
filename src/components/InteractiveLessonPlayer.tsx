import React, { useMemo, useState, lazy, Suspense, useEffect, useRef, useCallback } from "react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Loader2, Send, ChevronLeft, ChevronRight,
  Lightbulb, AlertTriangle, MessageCircleQuestion, CheckCircle2, XCircle,
  Sparkles, Brain, HelpCircle, ListChecks, ChevronDown, Leaf, Zap, Target,
  Volume2, VolumeX, Eye, Share2, Trophy, Flame, Radio, Image as ImageIcon, Palette,
} from "lucide-react";
import { generateDidacticImage } from "@/lib/floraImages";
import { useImageSearch } from "@/hooks/useImageSearch";
import { RichMediaPanel } from "@/components/RichMediaPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import "./InteractiveLessonPlayer.css";

const ReactMarkdown = lazy(() => import("react-markdown"));

/* ─── Visual panel: ilustrações temáticas por assunto ─── */
const SCENE_KICKERS: Record<string, string> = {
  intro: "Aula da Flora",
  impact: "Ponto-chave",
  exemplo: "Exemplo prático",
  analogia: "Pensa assim",
  macete: "Macete",
  pegadinha: "Cuidado",
  fixar: "Pra fixar",
  mini: "Pra pensar",
  duvida: "Dúvida comum",
  text: "Conteúdo",
  exercises: "Hora de praticar",
  final: "Revisão final",
  done: "Concluído",
};

type TopicCategory = "ecology" | "math" | "biology" | "chemistry" | "physics" | "history" | "geography" | "law" | "writing" | "tech" | "study";

function normalizeTopicText(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveTopicCategory(context: string): TopicCategory {
  const hay = normalizeTopicText(context);
  const match = (terms: string[]) => terms.some((term) => hay.includes(term));

  if (match(["ecolog", "ecossist", "meio ambiente", "bioma", "cadeia alimentar", "sustent", "biodivers", "populacao"])) return "ecology";
  if (match(["matemat", "algebra", "equac", "funcao", "geometr", "trigon", "raiz", "logarit", "porcent", "probabil", "estatist"])) return "math";
  if (match(["biolog", "celul", "dna", "genetic", "anatom", "fisiolog", "evolu", "especie"])) return "biology";
  if (match(["quimic", "reacao", "molecul", "atomo", "organica", "carbono", "estequiometr"])) return "chemistry";
  if (match(["fisica", "newton", "energia", "forca", "cinemat", "mecanica", "eletric", "circuito", "ondas"])) return "physics";
  if (match(["historia", "guerra", "revolu", "imperio", "colon", "republica", "idade media"])) return "history";
  if (match(["geograf", "mapa", "clima", "relevo", "urban", "territorio", "globalizacao"])) return "geography";
  if (match(["direito", "constitui", "jurid", "lei", "penal", "civil", "administrativo"])) return "law";
  if (match(["redac", "portugues", "gramat", "literat", "texto", "argument", "interpret", "sintax"])) return "writing";
  if (match(["informat", "comput", "tecnolog", "internet", "software", "hardware", "algorit"])) return "tech";
  return "study";
}

function TopicIllustration({ context, kind }: { context: string; kind: string }) {
  const category = resolveTopicCategory(context);
  const P = "hsl(var(--primary))";
  const A = "hsl(var(--accent))";
  const F = "hsl(var(--foreground))";
  const M = "hsl(var(--muted-foreground) / 0.42)";
  const S = "hsl(var(--secondary))";
  const B = "hsl(var(--background))";
  const common = { width: "100%", height: "100%", viewBox: "0 0 360 300", fill: "none", className: "ilp-topic-illustration" } as const;

  if (kind === "final" || kind === "done") {
    return (
      <svg {...common} role="img" aria-label="Aula concluída">
        <circle cx="180" cy="142" r="92" fill={P} opacity="0.1" />
        <path d="M180 62l20 45 49 5-37 33 11 49-43-25-43 25 11-49-37-33 49-5 20-45z" fill={A} stroke={P} strokeWidth="4" strokeLinejoin="round" />
        <path d="M106 222c28 22 120 22 148 0" stroke={P} strokeWidth="8" strokeLinecap="round" opacity="0.35" />
      </svg>
    );
  }

  switch (category) {
    case "ecology":
      return (
        <svg {...common} role="img" aria-label="Ilustração de ecologia com árvores, ciclo e curva populacional">
          <circle cx="286" cy="58" r="24" fill={A} opacity="0.55" />
          <path d="M36 220c54-58 95-57 145-18 48 38 91 32 143-18v76H36v-40z" fill={P} opacity="0.16" />
          <path d="M56 230h248" stroke={M} strokeWidth="3" strokeLinecap="round" />
          {[88, 136, 242].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 214v-${44 + i * 10}`} stroke={F} strokeWidth="9" strokeLinecap="round" opacity="0.7" />
              <circle cx={x - 16} cy={164 - i * 10} r="24" fill={P} opacity="0.78" />
              <circle cx={x + 14} cy={154 - i * 10} r="28" fill={A} opacity="0.7" />
              <circle cx={x} cy={135 - i * 10} r="22" fill={P} opacity="0.55" />
            </g>
          ))}
          <path d="M68 126c48-58 114-49 150-5 22 27 46 36 78 12" stroke={P} strokeWidth="5" strokeLinecap="round" />
          {[68, 126, 204, 296].map((x, i) => <circle key={x} cx={x} cy={[126, 88, 119, 133][i]} r="7" fill={A} />)}
          <path d="M74 58c18-22 55-22 72 0M146 58c18 22 55 22 72 0" stroke={M} strokeWidth="4" strokeLinecap="round" />
          <path d="M219 48l-1 24 22-11" fill={M} />
        </svg>
      );
    case "math":
      return (
        <svg {...common} role="img" aria-label="Ilustração matemática com operação e plano cartesiano">
          <rect x="46" y="42" width="268" height="184" rx="18" fill={S} stroke={M} strokeWidth="2" />
          <path d="M86 190h152M86 190V78" stroke={M} strokeWidth="3" strokeLinecap="round" />
          <path d="M90 170c34-54 64-70 96-44 25 21 43 18 69-30" stroke={P} strokeWidth="5" strokeLinecap="round" />
          <circle cx="90" cy="170" r="6" fill={A} /><circle cx="186" cy="126" r="6" fill={A} /><circle cx="255" cy="96" r="6" fill={A} />
          <rect x="96" y="70" width="166" height="46" rx="12" fill={B} stroke={P} strokeWidth="2" />
          <text x="179" y="100" textAnchor="middle" fontSize="23" fontWeight="800" fill={F}>2x + 5 = 17</text>
          <text x="98" y="250" fontSize="34" fontWeight="800" fill={P}>÷</text>
          <text x="154" y="250" fontSize="34" fontWeight="800" fill={A}>×</text>
          <text x="210" y="250" fontSize="34" fontWeight="800" fill={P}>√</text>
          <text x="262" y="250" fontSize="30" fontWeight="800" fill={A}>π</text>
        </svg>
      );
    case "biology":
      return (
        <svg {...common} role="img" aria-label="Ilustração de biologia com célula e DNA">
          <ellipse cx="148" cy="150" rx="92" ry="70" fill={P} opacity="0.12" stroke={P} strokeWidth="4" />
          <ellipse cx="148" cy="150" rx="36" ry="28" fill={A} opacity="0.55" stroke={A} strokeWidth="3" />
          <circle cx="96" cy="132" r="12" fill={P} opacity="0.55" /><circle cx="204" cy="172" r="10" fill={P} opacity="0.45" />
          <path d="M250 62c-40 36-40 72 0 108s40 72 0 108" stroke={P} strokeWidth="5" strokeLinecap="round" />
          <path d="M306 62c-40 36-40 72 0 108s40 72 0 108" stroke={A} strokeWidth="5" strokeLinecap="round" />
          {[78, 112, 146, 180, 214, 248].map((y) => <path key={y} d={`M252 ${y}h52`} stroke={M} strokeWidth="3" strokeLinecap="round" />)}
        </svg>
      );
    case "chemistry":
      return (
        <svg {...common} role="img" aria-label="Ilustração de química com moléculas e béquer">
          <path d="M106 70h86M130 70v82l-44 78c-9 16 2 36 21 36h84c19 0 30-20 21-36l-44-78V70" stroke={F} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          <path d="M106 220h86l24 42H82l24-42z" fill={P} opacity="0.22" />
          <circle cx="258" cy="108" r="28" fill={P} opacity="0.68" /><circle cx="302" cy="158" r="20" fill={A} opacity="0.72" /><circle cx="238" cy="190" r="18" fill={P} opacity="0.45" />
          <path d="M276 130l14 15M250 135l-7 38" stroke={M} strokeWidth="4" strokeLinecap="round" />
          <circle cx="126" cy="200" r="6" fill={A} /><circle cx="162" cy="232" r="7" fill={A} /><circle cx="146" cy="176" r="5" fill={A} />
        </svg>
      );
    case "physics":
      return (
        <svg {...common} role="img" aria-label="Ilustração de física com circuito e movimento">
          <path d="M70 82h92v54h78v64h54" stroke={M} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="162" cy="136" r="18" fill={P} /><circle cx="240" cy="200" r="18" fill={A} />
          <path d="M112 62v128" stroke={F} strokeWidth="4" opacity="0.65" />
          <path d="M112 62c58 38 96 32 142 0" stroke={P} strokeWidth="4" strokeLinecap="round" />
          <line x1="178" y1="70" x2="178" y2="172" stroke={P} strokeWidth="3" />
          <circle cx="178" cy="190" r="22" fill={A} opacity="0.75" />
          <path d="M56 236c76-36 150-33 244 0" stroke={P} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
        </svg>
      );
    case "history":
      return (
        <svg {...common} role="img" aria-label="Ilustração de história com linha do tempo e documento antigo">
          <path d="M78 56h170c22 0 38 16 38 38v140H110c-18 0-32-14-32-32V56z" fill={S} stroke={M} strokeWidth="2" />
          <path d="M112 96h132M112 124h94M112 152h122" stroke={M} strokeWidth="5" strokeLinecap="round" />
          <path d="M64 244h232" stroke={P} strokeWidth="5" strokeLinecap="round" />
          {[92, 156, 220, 284].map((x, i) => <g key={x}><circle cx={x} cy="244" r="10" fill={i % 2 ? A : P} /><path d={`M${x} 218v-28`} stroke={i % 2 ? A : P} strokeWidth="3" strokeLinecap="round" /></g>)}
        </svg>
      );
    case "geography":
      return (
        <svg {...common} role="img" aria-label="Ilustração de geografia com mapa e relevo">
          <circle cx="172" cy="145" r="88" fill={P} opacity="0.1" stroke={P} strokeWidth="4" />
          <path d="M110 124c28-42 72-48 108-12 26 26 49 22 72 2" stroke={P} strokeWidth="6" strokeLinecap="round" />
          <path d="M82 198c42-38 78-42 116-14 34 25 66 20 100-12" stroke={A} strokeWidth="6" strokeLinecap="round" />
          <path d="M172 58v174M84 145h176" stroke={M} strokeWidth="2" />
          <path d="M44 246l52-62 42 38 46-68 54 76 36-30 44 46" fill={P} opacity="0.14" stroke={P} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case "law":
      return (
        <svg {...common} role="img" aria-label="Ilustração de direito com balança e livros">
          <path d="M180 62v164M128 96h104" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <path d="M128 96l-42 72h84l-42-72zM232 96l-42 72h84l-42-72z" fill={P} opacity="0.16" stroke={P} strokeWidth="4" strokeLinejoin="round" />
          <path d="M122 246h116" stroke={F} strokeWidth="9" strokeLinecap="round" opacity="0.75" />
          <rect x="62" y="224" width="78" height="22" rx="5" fill={A} opacity="0.75" />
          <rect x="220" y="224" width="78" height="22" rx="5" fill={P} opacity="0.75" />
        </svg>
      );
    case "writing":
      return (
        <svg {...common} role="img" aria-label="Ilustração de redação com folha, linhas e caneta">
          <rect x="76" y="42" width="186" height="216" rx="16" fill={S} stroke={M} strokeWidth="2" />
          <path d="M112 96h108M112 128h126M112 160h96M112 192h118" stroke={M} strokeWidth="6" strokeLinecap="round" />
          <path d="M236 86l42 42-92 92-48 14 14-48 84-100z" fill={P} opacity="0.18" stroke={P} strokeWidth="5" strokeLinejoin="round" />
          <path d="M236 86l42 42" stroke={A} strokeWidth="8" strokeLinecap="round" />
          <circle cx="96" cy="78" r="8" fill={A} opacity="0.8" />
        </svg>
      );
    case "tech":
      return (
        <svg {...common} role="img" aria-label="Ilustração de informática com tela e código">
          <rect x="62" y="62" width="236" height="148" rx="16" fill={S} stroke={M} strokeWidth="2" />
          <path d="M112 236h136M156 210l-12 26M204 210l12 26" stroke={F} strokeWidth="6" strokeLinecap="round" opacity="0.65" />
          <path d="M132 122l-28 24 28 24M228 122l28 24-28 24" stroke={P} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M196 112l-32 72" stroke={A} strokeWidth="7" strokeLinecap="round" />
          <circle cx="88" cy="88" r="5" fill={A} /><circle cx="106" cy="88" r="5" fill={P} /><circle cx="124" cy="88" r="5" fill={M} />
        </svg>
      );
    default:
      return (
        <svg {...common} role="img" aria-label="Ilustração de estudo com livros e quadro">
          <rect x="76" y="58" width="208" height="126" rx="18" fill={S} stroke={M} strokeWidth="2" />
          <path d="M112 104h92M112 132h128" stroke={M} strokeWidth="6" strokeLinecap="round" />
          <rect x="78" y="210" width="82" height="28" rx="6" fill={P} opacity="0.75" />
          <rect x="152" y="194" width="92" height="28" rx="6" fill={A} opacity="0.72" />
          <rect x="224" y="220" width="62" height="22" rx="6" fill={P} opacity="0.5" />
          <circle cx="258" cy="84" r="14" fill={A} opacity="0.85" />
        </svg>
      );
  }
}

function SceneVisual({ kind, image, context = "" }: { kind: string; image?: string; context?: string }) {
  const kicker = SCENE_KICKERS[kind] || SCENE_KICKERS.text;
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [image]);
  const showImage = !!image && !imgFailed;
  return (
    <aside className="ilp-visual" aria-hidden>
      {showImage ? (
        <>
          <img
            className="ilp-visual-img"
            src={image}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
          <div className="ilp-visual-overlay" />
          <div className="ilp-visual-caption-strip">
            <span className="ilp-visual-kicker">{kicker}</span>
          </div>
        </>
      ) : (
        <div className="ilp-visual-graphic-wrap" key={`${kind}-${context}`}>
          <span className="ilp-visual-kicker">{kicker}</span>
          <div className="ilp-visual-graphic">
            <TopicIllustration kind={kind} context={context || kind} />
          </div>
        </div>
      )}
    </aside>
  );
}

interface LessonBlock {
  titulo: string;
  conteudo: string;
  checkpoint?: string;
  macete?: string;
  pegadinha?: string;
  analogia?: string;
  exemplo_resolvido?: string;
  flora_comment?: string;
  mini_interacao?: string;
  duvida_simulada?: { pergunta: string; resposta: string };
}
interface Exercise { pergunta: string; alternativas?: string[]; opcoes?: string[]; correta: number; explicacao: string; }
interface Lesson {
  titulo: string; introducao: string; blocos: LessonBlock[];
  resumo: string | string[]; exercicios?: Exercise[]; exercicio_final: Exercise;
}
interface Props { lesson: Lesson; onComplete?: () => void; onExit?: () => void; enableVoice?: boolean; personality?: "padrao" | "amiga_motivadora" | "professora_rigorosa" | "tutor_engracado"; loadingBlockIndices?: number[]; materia?: string; }

function MD({ children }: { children: string }) {
  return (
    <Suspense fallback={<p style={{ whiteSpace: "pre-wrap" }}>{children}</p>}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{children}</ReactMarkdown>
    </Suspense>
  );
}

/* ─── Scene model ─────────────────────────────────────── */
type SceneKind = "intro" | "text" | "exemplo" | "analogia" | "macete" | "pegadinha" | "mini" | "fixar" | "duvida" | "impact";
interface Scene { kind: SceneKind; text: string; flora?: string; question?: string; }

const AUTO_ILLUST_KINDS: SceneKind[] = ["impact", "exemplo", "analogia", "macete", "intro"];

/** Higieniza texto vindo da IA: colapsa espaços, remove letras/pontuações repetidas,
 *  normaliza quebras de linha e tira espaços antes de pontuação. */
function sanitizeText(s: string): string {
  if (!s) return "";
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // limita letras repetidas: "aaaaa" → "aaa"
    .replace(/([a-zA-ZÀ-ÿ])\1{3,}/g, "$1$1$1")
    // limita pontuação repetida: "!!!!" → "!!", "...." → "..."
    .replace(/([!?])\1{2,}/g, "$1$1")
    .replace(/\.{4,}/g, "...")
    // sem espaço antes de pontuação
    .replace(/ +([.,;:!?])/g, "$1")
    .trim();
}

/** Tenta extrair uma frase curta e marcante (≤110 chars) para um slide de impacto. */
function extractImpactSentence(text: string): string | null {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  // Prioriza frases entre 30 e 110 chars que pareçam afirmações fortes
  const strong = sentences.find((s) => s.length >= 30 && s.length <= 110);
  if (strong) return strong.replace(/\*+/g, "");
  // fallback: primeira frase curta
  const short = sentences.find((s) => s.length <= 130);
  return short ? short.replace(/\*+/g, "") : null;
}

/** Agrupa parágrafos em chunks robustos (~500-700 chars) para não fragmentar demais. */
function splitParagraphs(s: string): string[] {
  const cleaned = (s || "").trim();
  if (!cleaned) return [];
  // Mantém todos os parágrafos juntos — texto denso por slide é o que o usuário pediu.
  return [cleaned];
}

/** Hash determinístico simples para variar a ordem dos slides por aula. */
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildScenes(b: LessonBlock, blockIdx: number, lessonSeed = 0): Scene[] {
  const scenes: Scene[] = [];
  const mainText = sanitizeText(b.conteudo || "");

  // Evita duplicar flora_comment quando ele já está embutido no conteúdo principal.
  const floraText = sanitizeText(b.flora_comment || "");
  const floraInMain =
    floraText.length > 0 &&
    mainText.toLowerCase().includes(floraText.toLowerCase().slice(0, Math.min(60, floraText.length)));
  const flora = floraText && !floraInMain ? floraText : undefined;

  // Slide de impacto: dispara em blocos alternados (a partir do 2º) quando há frase forte.
  // Cria a memória emocional sem repetir o conteúdo do intro (a frase é REMOVIDA do mainText).
  let textForIntro = mainText;
  if (blockIdx > 0 && blockIdx % 2 === 1) {
    const impact = extractImpactSentence(mainText);
    if (impact && impact.length >= 30) {
      scenes.push({ kind: "impact", text: impact });
      // remove a frase do intro pra não repetir
      textForIntro = mainText.replace(impact, "").replace(/\s{2,}/g, " ").trim();
    }
  }

  // Cena única de explicação: bloco inteiro num slide só, com bolha da Flora se houver.
  scenes.push({ kind: "intro", flora, text: textForIntro });

  // No máximo UM slide complementar por bloco — rotaciona entre extras e closers
  // para que cada bloco tenha sabor diferente, sem repetir conteúdo.
  const candidates: Scene[] = [];
  if (b.exemplo_resolvido) candidates.push({ kind: "exemplo", text: sanitizeText(b.exemplo_resolvido) });
  if (b.analogia) candidates.push({ kind: "analogia", text: sanitizeText(b.analogia) });
  if (b.macete) candidates.push({ kind: "macete", text: sanitizeText(b.macete) });
  if (b.pegadinha) candidates.push({ kind: "pegadinha", text: sanitizeText(b.pegadinha) });
  if (b.checkpoint) candidates.push({ kind: "fixar", text: sanitizeText(b.checkpoint) });
  if (b.mini_interacao) candidates.push({ kind: "mini", text: sanitizeText(b.mini_interacao) });
  if (b.duvida_simulada?.pergunta) {
    candidates.push({
      kind: "duvida",
      text: sanitizeText(b.duvida_simulada.resposta),
      question: sanitizeText(b.duvida_simulada.pergunta),
    });
  }
  if (candidates.length) {
    // Quebra a previsibilidade: a ordem dos candidatos depende de um seed da aula,
    // então a mesma aula é estável mas diferentes aulas variam o ritmo.
    const offset = (lessonSeed + blockIdx * 7) % candidates.length;
    scenes.push(candidates[offset]);
  }

  return scenes;
}

/** Frases curtas de encorajamento da Flora — rotacionam quando flora_comment não vem do backend. */
const FLORA_ENCOURAGEMENT = [
  "Foca aqui comigo — vai fazer sentido em segundos.",
  "Esse pedaço aqui é onde a maioria trava. Vou facilitar.",
  "Se entender isso, o resto do bloco vira consequência.",
  "Lê devagar, sem pressa. Eu tô do teu lado.",
  "Esse é o tipo de coisa que cai e a galera erra. Tu não vai.",
  "Pronto pra mais um? Esse é rapidinho.",
];

/* ─── Reforço / passos guiados (igual antes) ──────────── */
interface ReforcoData { porque_errou?: string; analogia?: string; exemplo_novo?: string; dica_flora?: string; }
interface PassoGuiado { titulo: string; conteudo: string; }

function GuidedStep({ passo, idx, tema, pergunta }: { passo: PassoGuiado; idx: number; tema?: string; pergunta: string }) {
  const [expanded, setExpanded] = useState(false);
  const [explic, setExplic] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const askExplain = async () => {
    setExpanded(true);
    if (explic || loading) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("flora-engine", {
        body: { action: "lesson_explain_step", data: { tema, pergunta, passoTitulo: passo.titulo, passoConteudo: passo.conteudo } },
      });
      if (data?.ok && data.explicacao) setExplic(data.explicacao);
      else setExplic("Não consegui detalhar esse passo agora.");
    } catch { setExplic("Não consegui detalhar esse passo agora."); }
    finally { setLoading(false); }
  };
  return (
    <div className="ilp-passo">
      <div className="ilp-passo-head">
        <span className="ilp-passo-num">{idx + 1}</span>
        <strong className="ilp-passo-titulo">{passo.titulo}</strong>
      </div>
      <div className="ilp-passo-conteudo"><MD>{passo.conteudo}</MD></div>
      <button className="ilp-passo-ask" onClick={askExplain}>
        <HelpCircle size={12} />
        {expanded ? "Explicação detalhada" : "Me explica esse passo"}
        <ChevronDown size={12} className={`ilp-passo-chev ${expanded ? "open" : ""}`} />
      </button>
      {expanded && (
        <div className="ilp-passo-explic">
          {loading && !explic ? <div className="ilp-reforco-loading"><Loader2 size={12} className="ilp-spin" /> <span>Flora pensando…</span></div> : <MD>{explic}</MD>}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ ex, label, tema, blocoTitulo }: { ex: Exercise; label?: string; tema?: string; blocoTitulo?: string }) {
  const opts = ex.alternativas || ex.opcoes || [];
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === ex.correta;
  const [reforco, setReforco] = useState<ReforcoData | null>(null);
  const [reforcoLoading, setReforcoLoading] = useState(false);
  const [reforcoTried, setReforcoTried] = useState(false);
  const [passos, setPassos] = useState<PassoGuiado[] | null>(null);
  const [passosLoading, setPassosLoading] = useState(false);

  const askGuided = async () => {
    if (passos || passosLoading) return;
    setPassosLoading(true);
    try {
      const { data } = await supabase.functions.invoke("flora-engine", {
        body: { action: "lesson_guided_solution", data: { tema, pergunta: ex.pergunta, alternativaCorreta: opts[ex.correta], explicacao: ex.explicacao } },
      });
      if (data?.ok && Array.isArray(data.passos)) setPassos(data.passos);
    } catch {
      // Ignora falhas pontuais da ajuda guiada para não travar o exercício.
    } finally { setPassosLoading(false); }
  };

  const pickAnswer = async (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i !== ex.correta && !reforcoTried) {
      setReforcoTried(true); setReforcoLoading(true);
      try {
        const { data } = await supabase.functions.invoke("flora-engine", {
          body: { action: "lesson_reinforce", data: { tema, blocoTitulo, pergunta: ex.pergunta, alternativaErrada: opts[i], alternativaCorreta: opts[ex.correta], explicacao: ex.explicacao } },
        });
        if (data?.ok && data.reforco) setReforco(data.reforco as ReforcoData);
      } catch {
        // Ignora falhas pontuais do reforço para manter a resposta do aluno visível.
      } finally { setReforcoLoading(false); }
    }
  };

  return (
    <div className="exercise-card">
      {label && <span className="exercise-label">{label}</span>}
      <div className="exercise-q"><MD>{ex.pergunta}</MD></div>
      <div className="exercise-opts">
        {opts.map((o, i) => {
          const cls = picked === null ? "" : i === ex.correta ? "correct" : i === picked ? "wrong" : "muted";
          return (
            <button key={i} className={`exercise-opt ${cls}`} onClick={() => pickAnswer(i)} disabled={picked !== null}>
              <span className="exercise-opt-letter">{String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`exercise-feedback ${correct ? "ok" : "err"}`}>
          {correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <div><MD>{ex.explicacao}</MD></div>
        </div>
      )}
      {!correct && picked !== null && (reforcoLoading || reforco) && (
        <div className="ilp-reforco">
          <div className="ilp-reforco-head"><Sparkles size={14} /><span>Reforço da Flora</span></div>
          {reforcoLoading && !reforco && <div className="ilp-reforco-loading"><Loader2 size={14} className="ilp-spin" /><span>Pensando num jeito novo de explicar…</span></div>}
          {reforco && (
            <div className="ilp-reforco-body">
              {reforco.porque_errou && <div className="ilp-reforco-row"><strong>Por que errou:</strong> <MD>{reforco.porque_errou}</MD></div>}
              {reforco.analogia && <div className="ilp-reforco-row ilp-reforco-analogia"><Brain size={14} /><div><strong>Pensa assim:</strong> <MD>{reforco.analogia}</MD></div></div>}
              {reforco.exemplo_novo && <div className="ilp-reforco-row ilp-reforco-exemplo"><Lightbulb size={14} /><div><strong>Outro exemplo:</strong> <MD>{reforco.exemplo_novo}</MD></div></div>}
              {reforco.dica_flora && <div className="ilp-reforco-dica"><MD>{reforco.dica_flora}</MD></div>}
            </div>
          )}
        </div>
      )}
      {picked !== null && (
        <div className="ilp-guided-wrap">
          {!passos && <button className="ilp-guided-btn" onClick={askGuided} disabled={passosLoading}>{passosLoading ? <><Loader2 size={14} className="ilp-spin" /> Montando passos…</> : <><ListChecks size={14} /> Resolução guiada passo a passo</>}</button>}
          {passos && (
            <div className="ilp-guided">
              <div className="ilp-guided-head"><ListChecks size={14} /> <span>Resolução em {passos.length} passos</span></div>
              {passos.map((p, i) => <GuidedStep key={i} passo={p} idx={i} tema={tema} pergunta={ex.pergunta} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────── */
function BlockSkeleton() {
  return (
    <div className="ilp-skeleton">
      <div className="ilp-skel-flora"><Sparkles size={14} className="ilp-skel-pulse" /><span>Flora escrevendo…</span></div>
      <div className="ilp-skel-line w-90" />
      <div className="ilp-skel-line w-80" />
      <div className="ilp-skel-line w-60" />
    </div>
  );
}

/* ─── Mini-interação revelável ─────────────────────────── */
function RevealScene({
  tag, title, content, revealLabel = "Mostrar resposta", onReveal,
}: {
  tag: React.ReactNode;
  title?: string;
  content: string;
  revealLabel?: string;
  onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      {tag}
      {title && (
        <h3 className="ilp-block-title" style={{ fontSize: "clamp(20px, 2.6vw, 28px)" }}>
          {title}
        </h3>
      )}
      {!revealed ? (
        <button
          className="ilp-reveal-btn"
          onClick={() => { setRevealed(true); onReveal?.(); }}
        >
          <Eye size={14} /> {revealLabel}
        </button>
      ) : (
        <div className="ilp-md-lg ilp-reveal-content"><MD>{content}</MD></div>
      )}
    </>
  );
}

/* ─── Main player ─────────────────────────────────────── */
export const InteractiveLessonPlayer: React.FC<Props> = ({ lesson, onComplete, onExit, loadingBlockIndices, materia }) => {
  const { user } = useAuth();
  const [stage, setStage] = useState<"intro" | "block" | "exercises" | "final" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);

  const [duvidaOpen, setDuvidaOpen] = useState(false);
  const [duvidaText, setDuvidaText] = useState("");
  const [duvidaLoading, setDuvidaLoading] = useState(false);
  const [duvidaResp, setDuvidaResp] = useState("");

  // Ilustrações contextuais automáticas por cena
  const [sceneImages, setSceneImages] = useState<Record<string, string>>({});
  const [sceneImgLoading, setSceneImgLoading] = useState<Record<string, boolean>>({});
  const [richMediaOpen, setRichMediaOpen] = useState(false);

  // Auto-abre o painel de mídia em temas com dados (economia, clima, demografia, etc.)
  // só na 1ª vez por aula, e respeita se o usuário fechou manualmente.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    const hay = `${materia || ""} ${lesson.titulo || ""}`.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const dataKeywords = [
      "econom", "pib", "renda", "desigualdade", "inflac", "juros",
      "clima", "co2", "emissao", "aquecimento", "efeito estufa", "temperatura",
      "demograf", "populac", "expectativa de vida", "mortalidade", "natalidade",
      "desmatamento", "biodiversidade", "energia", "eletricidade", "renovavel",
      "alfabetiz", "escolaridade", "educacao",
    ];
    if (dataKeywords.some((k) => hay.includes(k))) {
      autoOpenedRef.current = true;
      setRichMediaOpen(true);
    }
  }, [materia, lesson.titulo]);

  // Direção da transição (forward/back) e som
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ilp-sound") !== "off";
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTone = useCallback((freq: number, dur = 0.08, type: OscillatorType = "sine", gain = 0.06) => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* silent */ }
  }, [soundOn]);
  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      const nv = !v;
      try { localStorage.setItem("ilp-sound", nv ? "on" : "off"); } catch {
        // O modo privado pode bloquear localStorage.
      }
      return nv;
    });
  }, []);

  const blocos = lesson.blocos || [];
  const cur = blocos[idx];
  const isLast = idx === blocos.length - 1;
  const isCurLoading = !!loadingBlockIndices?.includes(idx);

  const lessonSeed = useMemo(() => strHash(lesson.titulo || ""), [lesson.titulo]);
  const scenes = useMemo(() => (cur ? buildScenes(cur, idx, lessonSeed) : []), [cur, idx, lessonSeed]);
  const curScene = scenes[sceneIdx];

  // Busca foto temática (Unsplash → Pexels → Pixabay) como fallback do DALL-E por cena.
  // Inclui a matéria pra ancorar o tema (sem isso, títulos abstratos como
  // "Quem come quem" devolvem fotos aleatórias). Limpa parênteses e fluff.
  const cleanForSearch = (s: string) =>
    (s || "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[:?!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const blockImageQuery = cur
    ? `${materia || ""} ${cleanForSearch(lesson.titulo)} ${cleanForSearch(cur.titulo)}`.trim()
    : "";
  const { url: blockSearchUrl } = useImageSearch(blockImageQuery, !!cur && !!blockImageQuery);

  // Chave estável da cena atual (cacheia por título do bloco + tipo + início do texto)
  const sceneImgKey = useMemo(() => {
    if (!curScene || !cur) return "";
    const slug = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    return `${slug(lesson.titulo)}|${slug(cur.titulo)}|${curScene.kind}|${slug(curScene.text || "")}`;
  }, [curScene, cur, lesson.titulo]);
  const currentSceneImg = sceneImgKey ? sceneImages[sceneImgKey] : "";
  const currentSceneImgLoading = sceneImgKey ? !!sceneImgLoading[sceneImgKey] : false;

  // Auto-gera ilustração para cenas de alto-impacto. Debounce evita gerar
  // ao só "passar" pelo slide. Usa cache em localStorage entre sessões.
  useEffect(() => {
    if (!curScene || !cur || !sceneImgKey) return;
    if (!AUTO_ILLUST_KINDS.includes(curScene.kind)) return;
    if (sceneImages[sceneImgKey] || sceneImgLoading[sceneImgKey]) return;

    const cacheKey = `flora-img:scene:${sceneImgKey}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setSceneImages((p) => ({ ...p, [sceneImgKey]: cached }));
        return;
      }
    } catch { /* ignore */ }

    const t = setTimeout(async () => {
      setSceneImgLoading((p) => ({ ...p, [sceneImgKey]: true }));
      try {
        const styleByKind: Record<string, "scientific" | "educational" | "artistic" | "diagram"> = {
          impact: "artistic",
          analogia: "artistic",
          exemplo: "educational",
          macete: "diagram",
          intro: "educational",
        };
        const r = await generateDidacticImage({
          concept: curScene.kind === "impact" ? (curScene.text.slice(0, 80) || cur.titulo) : cur.titulo,
          context: `${lesson.titulo} — ${cur.titulo}. ${curScene.kind}: ${curScene.text.slice(0, 320)}`,
          style: styleByKind[curScene.kind] || "educational",
          userId: user?.id || "anon",
        });
        if (r.success && r.imageUrl) {
          setSceneImages((p) => ({ ...p, [sceneImgKey]: r.imageUrl }));
          try { localStorage.setItem(cacheKey, r.imageUrl); } catch { /* ignore */ }
        }
      } catch { /* silent */ }
      finally {
        setSceneImgLoading((p) => ({ ...p, [sceneImgKey]: false }));
      }
    }, 650);
    return () => clearTimeout(t);
  }, [sceneImgKey, curScene, cur, lesson.titulo, user?.id]);

  // Reset scene when block changes
  useEffect(() => { setSceneIdx(0); }, [idx]);

  const askDuvida = async () => {
    if (!duvidaText.trim() || duvidaLoading) return;
    setDuvidaLoading(true); setDuvidaResp("");
    try {
      const { data, error } = await supabase.functions.invoke("flora-engine", {
        body: { action: "lesson_doubt", data: { tema: lesson.titulo, blocoTitulo: cur?.titulo, blocoConteudo: cur?.conteudo, duvida: duvidaText.trim() } },
      });
      if (error) throw error;
      setDuvidaResp(data?.resposta || "Não consegui responder agora.");
    } catch { toast.error("Erro ao pedir ajuda à Flora."); }
    finally { setDuvidaLoading(false); }
  };

  const next = () => {
    setDuvidaOpen(false); setDuvidaResp(""); setDuvidaText("");
    setDirection("forward");
    if (stage === "intro") { setStage("block"); return; }
    if (stage === "block") {
      // advance scene first
      if (sceneIdx < scenes.length - 1) { setSceneIdx((s) => s + 1); playTone(660, 0.06, "sine", 0.04); return; }
      if (!isLast) { setIdx((i) => i + 1); playTone(880, 0.12, "sine", 0.05); return; }
      if (lesson.exercicios && lesson.exercicios.length) setStage("exercises");
      else setStage("final");
      playTone(990, 0.18, "triangle", 0.06);
      return;
    }
    if (stage === "exercises") { setStage("final"); return; }
    if (stage === "final") {
      setStage("done");
      // pequena melodia de conclusão
      playTone(660, 0.1, "sine", 0.06);
      setTimeout(() => playTone(880, 0.12, "sine", 0.06), 90);
      setTimeout(() => playTone(1320, 0.2, "triangle", 0.07), 200);
      onComplete?.();
    }
  };
  const prev = () => {
    setDuvidaOpen(false); setDuvidaResp(""); setDuvidaText("");
    setDirection("backward");
    playTone(440, 0.05, "sine", 0.03);
    if (stage === "intro") { onExit?.(); return; }
    if (stage === "block") {
      if (sceneIdx > 0) { setSceneIdx((s) => s - 1); return; }
      if (idx > 0) { setIdx((i) => i - 1); return; }
      setStage("intro"); return;
    }
    if (stage === "exercises") { setStage("block"); setIdx(blocos.length - 1); setSceneIdx(0); return; }
    if (stage === "final") { setStage(lesson.exercicios?.length ? "exercises" : "block"); return; }
  };

  // Total micro-steps (for progress bar)
  const totalScenes = useMemo(() => {
    let t = 1; // intro
    for (let i = 0; i < blocos.length; i++) t += buildScenes(blocos[i], i, lessonSeed).length;
    if (lesson.exercicios?.length) t += 1;
    t += 1; // final
    return t;
  }, [blocos, lesson.exercicios, lessonSeed]);

  const currentStep = useMemo(() => {
    let s = 0;
    if (stage === "intro") return 1;
    s += 1; // intro counted
    for (let i = 0; i < idx; i++) s += buildScenes(blocos[i], i, lessonSeed).length;
    if (stage === "block") return s + sceneIdx + 1;
    // past all blocks
    for (let i = idx; i < blocos.length; i++) s += buildScenes(blocos[i], i, lessonSeed).length;
    if (stage === "exercises") return s + 1;
    if (lesson.exercicios?.length) s += 1;
    if (stage === "final") return s + 1;
    return totalScenes;
  }, [stage, idx, sceneIdx, blocos, lesson.exercicios, totalScenes, lessonSeed]);

  const progress = currentStep / totalScenes;
  const resumo = Array.isArray(lesson.resumo) ? lesson.resumo : (typeof lesson.resumo === "string" ? [lesson.resumo] : []);
  const visualContext = [lesson.titulo, cur?.titulo, cur?.conteudo, curScene?.text]
    .filter(Boolean)
    .join(" | ");

  // keyboard navigation (Keynote-style)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (duvidaOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="ilp-root" data-direction={direction}>
      {/* fundo animado: blobs com blur */}
      <div className="ilp-bg">
        <span className="ilp-blob ilp-blob-1" />
        <span className="ilp-blob ilp-blob-2" />
        <span className="ilp-blob ilp-blob-3" />
      </div>
      {/* ── Header: minimal, breathable ── */}
      <div className="ilp-header">
        <div className="ilp-header-row">
          <div className="ilp-header-left">
            <div className="ilp-leaf"><Leaf size={14} /></div>
            <h1 className="ilp-title">{lesson.titulo}</h1>
          </div>
          <div className="ilp-header-right">
            <button
              className="ilp-icon-btn"
              onClick={toggleSound}
              aria-label={soundOn ? "Desativar sons" : "Ativar sons"}
              title={soundOn ? "Sons ativados" : "Sons desativados"}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <span className="ilp-step-tag">{currentStep} / {totalScenes}</span>
          </div>
        </div>
        <div className="ilp-bar"><div className="ilp-fill" style={{ width: `${progress * 100}%` }} /></div>
      </div>

      <div className="ilp-layout">
        {/* ── Painel visual (esquerda) — ilustração temática ── */}
        <SceneVisual
          kind={
            stage === "intro" ? "intro"
            : stage === "exercises" ? "exercises"
            : stage === "final" ? "final"
            : stage === "done" ? "done"
            : (curScene?.kind || "text")
          }
          image={stage === "block" ? (blockSearchUrl || undefined) : undefined}
          context={visualContext}
        />
        {/* ── Stage canvas ── */}
        <div className="ilp-stage">
          {stage === "intro" && (
            <div className="ilp-scene ilp-scene-intro" key="intro">
              <div className="ilp-flora-mark"><Leaf size={18} /> Flora</div>
              <div className="ilp-md ilp-md-lg"><MD>{lesson.introducao}</MD></div>
            </div>
          )}

          {stage === "block" && cur && (
            <div
              className={`ilp-scene ${curScene?.kind === "impact" ? "ilp-scene-impact" : ""}`}
              key={`b${idx}-s${sceneIdx}-${direction}`}
              data-direction={direction}
            >
              {/* Block title: só na primeira cena que NÃO seja impact.
                  Omite quando o título do bloco repete o título da aula (já mostrado no header). */}
              {sceneIdx === 0 && curScene?.kind !== "impact" && (() => {
                const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
                const isDup = norm(cur.titulo) === norm(lesson.titulo);
                if (isDup) {
                  return (
                    <div className="ilp-scene-head">
                      <span className="ilp-block-tag">Bloco {idx + 1} · {blocos.length}</span>
                      <button
                        type="button"
                        onClick={() => setRichMediaOpen((v) => !v)}
                        className="ilp-media-btn"
                        title="Abrir mídia educacional (foto, vídeo, mapa, dados)"
                        aria-label="Abrir mídia educacional"
                      >
                        <Radio size={14} />
                      </button>
                    </div>
                  );
                }
                return (
                <div className="ilp-scene-head">
                  <span className="ilp-block-tag">Bloco {idx + 1} · {blocos.length}</span>
                  <div className="flex items-center gap-2">
                    <h2 className="ilp-block-title">{cur.titulo}</h2>
                    <button
                      type="button"
                      onClick={() => setRichMediaOpen((v) => !v)}
                      className="ilp-media-btn"
                      title="Abrir mídia educacional (foto, vídeo, mapa, dados)"
                      aria-label="Abrir mídia educacional"
                    >
                      <Radio size={14} />
                    </button>
                  </div>
                </div>
                );
              })()}

              {isCurLoading ? <BlockSkeleton /> : curScene && (
                <>
                  {curScene.kind === "impact" && (
                    <div className="ilp-impact">
                      {currentSceneImg && (
                        <img
                          className="ilp-impact-bg"
                          src={currentSceneImg}
                          alt=""
                          aria-hidden
                        />
                      )}
                      <div className="ilp-impact-glow" />
                      <span className="ilp-impact-label">
                        <Sparkles size={12} /> Isso aqui importa
                      </span>
                      <p className="ilp-impact-text">{curScene.text}</p>
                    </div>
                  )}

                  {curScene.kind === "intro" && (
                    <>
                      <div className="ilp-flora-bubble">
                        <div className="ilp-flora-avatar"><Leaf size={14} /></div>
                        <div>
                          <MD>{curScene.flora || FLORA_ENCOURAGEMENT[idx % FLORA_ENCOURAGEMENT.length]}</MD>
                        </div>
                      </div>
                      <div className="ilp-md ilp-md-lg"><MD>{curScene.text}</MD></div>
                      {/* Ilustração contextual automática */}
                      {(currentSceneImg || currentSceneImgLoading) && (
                        <div className={`ilp-scene-illust ${currentSceneImgLoading ? "loading" : ""}`}>
                          {currentSceneImg && <img src={currentSceneImg} alt={cur.titulo} />}
                        </div>
                      )}
                    </>
                  )}

                  {curScene.kind === "text" && (
                    <div className="ilp-md ilp-md-lg"><MD>{curScene.text}</MD></div>
                  )}

                  {curScene.kind === "exemplo" && (
                    <>
                      <span className="ilp-tag exemplo"><Target size={12} /> Exemplo</span>
                      {(currentSceneImg || currentSceneImgLoading) && (
                        <div className={`ilp-scene-illust ${currentSceneImgLoading ? "loading" : ""}`}>
                          {currentSceneImg && <img src={currentSceneImg} alt={cur.titulo} />}
                        </div>
                      )}
                      <div className="ilp-md-lg"><MD>{curScene.text}</MD></div>
                    </>
                  )}

                  {curScene.kind === "analogia" && (
                    <>
                      <span className="ilp-tag analogia"><Brain size={12} /> Pensa assim</span>
                      {(currentSceneImg || currentSceneImgLoading) && (
                        <div className={`ilp-scene-illust ${currentSceneImgLoading ? "loading" : ""}`}>
                          {currentSceneImg && <img src={currentSceneImg} alt={cur.titulo} />}
                        </div>
                      )}
                      <div className="ilp-md-lg"><MD>{curScene.text}</MD></div>
                    </>
                  )}

                  {curScene.kind === "macete" && (
                    <>
                      <span className="ilp-tag macete"><Zap size={12} /> Macete</span>
                      {(currentSceneImg || currentSceneImgLoading) && (
                        <div className={`ilp-scene-illust ${currentSceneImgLoading ? "loading" : ""}`}>
                          {currentSceneImg && <img src={currentSceneImg} alt={cur.titulo} />}
                        </div>
                      )}
                      <div className="ilp-md-lg"><MD>{curScene.text}</MD></div>
                    </>
                  )}

                  {curScene.kind === "pegadinha" && (
                    <>
                      <span className="ilp-tag pegadinha"><AlertTriangle size={12} /> Cai muito</span>
                      <div className="ilp-md-lg"><MD>{curScene.text}</MD></div>
                    </>
                  )}

                  {curScene.kind === "mini" && (
                    <RevealScene
                      tag={<span className="ilp-tag mini"><HelpCircle size={12} /> Pra pensar</span>}
                      content={curScene.text}
                      revealLabel="Pensei. Mostrar"
                      onReveal={() => playTone(720, 0.1, "sine", 0.05)}
                    />
                  )}

                  {curScene.kind === "fixar" && (
                    <>
                      <span className="ilp-tag fixar"><CheckCircle2 size={12} /> Pra fixar</span>
                      <div className="ilp-md-lg"><MD>{curScene.text}</MD></div>
                    </>
                  )}

                  {curScene.kind === "duvida" && (
                    <RevealScene
                      tag={<span className="ilp-tag duvida"><MessageCircleQuestion size={12} /> Dúvida comum</span>}
                      title={curScene.question}
                      content={curScene.text}
                      revealLabel="Ver resposta da Flora"
                      onReveal={() => playTone(720, 0.1, "sine", 0.05)}
                    />
                  )}

                  {/* Scene dots */}
                  {scenes.length > 1 && (
                    <div className="ilp-dots">
                      {scenes.map((_, i) => (
                        <button
                          key={i}
                          className={`ilp-dot ${i === sceneIdx ? "active" : ""} ${i < sceneIdx ? "done" : ""}`}
                          onClick={() => setSceneIdx(i)}
                          aria-label={`Cena ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Os botões de "Entendi/Confuso" eram redundantes com Continuar/Tirar dúvida no rodapé.
                      Removidos para limpar a interface. */}
                </>
              )}
            </div>
          )}

          {stage === "exercises" && lesson.exercicios && (
            <div className="ilp-scene">
              <div className="ilp-scene-head">
                <span className="ilp-block-tag">Pratique</span>
                <h2 className="ilp-block-title">Hora de testar</h2>
              </div>
              {lesson.exercicios.map((ex, i) => <ExerciseCard key={i} ex={ex} label={`Exercício ${i + 1}`} tema={lesson.titulo} blocoTitulo={cur?.titulo} />)}
            </div>
          )}

          {stage === "final" && (
            <div className="ilp-scene">
              <div className="ilp-scene-head">
                <span className="ilp-block-tag">Revisão</span>
                <h2 className="ilp-block-title">O essencial</h2>
              </div>
              {resumo.length > 0 && (
                <ul className="ilp-resumo">
                  {resumo.map((r, i) => <li key={i}><MD>{r}</MD></li>)}
                </ul>
              )}
              {lesson.exercicio_final && <ExerciseCard ex={lesson.exercicio_final} label="Questão final" tema={lesson.titulo} />}
            </div>
          )}

          {stage === "done" && (
            <div className="ilp-scene ilp-done">
              <div className="ilp-done-icon"><Trophy size={36} /></div>
              <h2>Aula concluída</h2>
              <p className="ilp-done-sub">Você terminou <strong>{lesson.titulo}</strong>.</p>

              <div className="ilp-done-stats">
                <div className="ilp-done-stat">
                  <Sparkles size={18} />
                  <strong>+{50 + blocos.length * 5}</strong>
                  <span>XP</span>
                </div>
                <div className="ilp-done-stat">
                  <Flame size={18} />
                  <strong>{blocos.length}</strong>
                  <span>blocos</span>
                </div>
                <div className="ilp-done-stat">
                  <CheckCircle2 size={18} />
                  <strong>{(lesson.exercicios?.length || 0) + (lesson.exercicio_final ? 1 : 0)}</strong>
                  <span>exercícios</span>
                </div>
              </div>

              <div className="ilp-flora-bubble" style={{ marginTop: 20 }}>
                <div className="ilp-flora-avatar"><Leaf size={14} /></div>
                <div>
                  Você foi muito bem nessa. Quer fixar agora com revisão espaçada, ou já partir pra próxima aula?
                </div>
              </div>

              <div className="ilp-done-actions">
                <button
                  className="ilp-nav primary"
                  onClick={() => onComplete?.()}
                >
                  <Sparkles size={16} /> Próxima aula
                </button>
                <button
                  className="ilp-nav ghost"
                  onClick={async () => {
                    const text = `Acabei de concluir "${lesson.titulo}" no StudyFlow com a Flora 🌿`;
                    try {
                      if (navigator.share) await navigator.share({ title: lesson.titulo, text });
                      else { await navigator.clipboard.writeText(text); toast.success("Copiado para compartilhar!"); }
                    } catch { /* user cancel */ }
                  }}
                >
                  <Share2 size={16} /> Compartilhar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Minimal footer ── */}
      <div className="ilp-controls">
        <button className="ilp-nav ghost" onClick={prev} disabled={stage === "done"}>
          <ChevronLeft size={16} /> <span>{stage === "intro" ? "Sair" : "Voltar"}</span>
        </button>
        <button className="ilp-nav ghost" onClick={() => setDuvidaOpen((v) => !v)}>
          <MessageCircleQuestion size={16} /> <span>Tirar dúvida</span>
        </button>
        <button className="ilp-nav primary" onClick={next} disabled={stage === "done"}>
          <span>{stage === "intro" ? "Começar" : stage === "final" ? "Concluir" : "Continuar"}</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {duvidaOpen && (
        <div className="ilp-duvida-panel">
          <div className="ilp-duvida-head">
            <strong>Pergunta para Flora</strong>
            <button onClick={() => setDuvidaOpen(false)}>✕</button>
          </div>
          {duvidaResp ? (
            <div className="ilp-duvida-resp">
              <div className="ilp-md"><MD>{duvidaResp}</MD></div>
              <button className="ilp-primary" onClick={() => { setDuvidaResp(""); setDuvidaText(""); }}>Outra pergunta</button>
            </div>
          ) : (
            <div className="ilp-duvida-form">
              <textarea rows={3} placeholder="Não entendi essa parte... explica de outra forma?" value={duvidaText} onChange={(e) => setDuvidaText(e.target.value)} />
              <button className="ilp-primary" onClick={askDuvida} disabled={duvidaLoading || !duvidaText.trim()}>
                {duvidaLoading ? <><Loader2 size={14} className="ilp-spin" /> Pensando...</> : <><Send size={14} /> Perguntar</>}
              </button>
            </div>
          )}
        </div>
      )}

      {richMediaOpen && cur && (
        <div className="ilp-rich-media-panel">
          <RichMediaPanel
            subject={materia || "Geral"}
            topic={`${cur.titulo} ${lesson.titulo}`}
            onClose={() => setRichMediaOpen(false)}
            showInsert={false}
          />
        </div>
      )}
    </div>
  );
};
