import { useState } from "react";
import { ImageIcon, Maximize2, X, FileText, Quote, Music, ChevronDown, ChevronUp } from "lucide-react";
import { MathText } from "@/components/MathText";

// ────────────────────────────────────────────────────────────────────────────────
// Detecção de blocos
// Heurísticas leves p/ separar texto de apoio (prose / poema / citação) do
// comando da questão. Não depende de modelo — só do formato do texto.
// ────────────────────────────────────────────────────────────────────────────────

type BlockKind = "prose" | "poem" | "quote" | "prompt" | "label";

interface Block {
  kind: BlockKind;
  text: string;
  label?: string; // ex: "TEXTO I", "TEXTO II"
}

const TEXT_LABEL_RE = /^\s*(TEXTO|TEXT|FRAGMENTO|POEMA|CAN[ÇC][ÃA]O|TIRINHA|CHARGE|HQ|QUADRINHO|TABELA|GR[ÁA]FICO|FIGURA|IMAGEM|EXCERTO)\s*([IVX0-9]{0,4})?\s*[:\-–]?\s*$/i;

const PROMPT_PATTERNS = [
  /^(de\s+acordo\s+com|com\s+base\s+(?:no|na|nos|nas)|a\s+partir\s+(?:do|da|dos|das|de)|considerando\s+(?:o|a|os|as|que)|tendo\s+em\s+vista|segundo\s+(?:o|a|os|as)|no\s+texto|nos\s+textos|o\s+texto|os\s+textos|a\s+partir\s+da\s+leitura|a\s+leitura\s+do\s+texto|levando\s+em\s+(?:conta|considera[çc][ãa]o)|diante\s+(?:do|da|dos|das|disso)|com\s+rela[çc][ãa]o\s+(?:ao|a|aos|as)|em\s+rela[çc][ãa]o\s+(?:ao|a|aos|as))/i,
  /^(ness[ae]|nest[ae]|ness[ae]s|nest[ae]s|nest[ae]\s+(?:texto|trecho|fragmento|contexto|cen[áa]rio|poema|can[çc][ãa]o|charge|tirinha|imagem|gr[áa]fico|tabela|excerto))/i,
  /^(no\s+(?:fragmento|trecho|excerto|poema|cen[áa]rio|contexto|caso|exemplo|gr[áa]fico|esquema|quadro))/i,
  /^(a\s+(?:imagem|charge|tirinha|figura|tabela|cena|letra|m[úu]sica|can[çc][ãa]o|hist[óo]ria|narrativa|propaganda|campanha)|as\s+(?:imagens|figuras|cenas|charges|tirinhas))/i,
  /^(esse|essa|esses|essas|este|esta|estes|estas)\s+(?:texto|trecho|fragmento|poema|can[çc][ãa]o|excerto|argumento|coment[áa]rio|relato|dado|gr[áa]fico|quadro)/i,
  /^(o\s+(?:autor|fragmento|trecho|poema|cartaz|cartum|cordel|relato|dado|gr[áa]fico|esquema|excerto|coment[áa]rio|enunciado|t[íi]tulo|verso|narrador)|os\s+(?:autores|versos|textos|dados))/i,
  /^(assinale|marque|julgue|indique|identifique|aponte|qual|quais|que\s+|por\s+que|com\s+rela[çc][ãa]o|infere\-se|depreende\-se|conclui\-se|observa\-se|verifica\-se|nota\-se|percebe\-se)/i,
  /\b(alternativa\s+correta|op[çc][ãa]o\s+correta|tem(?:\s+como)?\s+objetivo|introduz\s+a\s+ideia|tem\s+por\s+(?:objetivo|finalidade)|cumpre\s+a\s+fun[çc][ãa]o)\b/i,
  /(introduz\s+a\s+ideia\s+de\s*$|expressa\s+a\s+ideia\s+de\s*$|refere\-se\s+(?:a|ao)\s*$)/i,
];

function isLikelyPrompt(p: string): boolean {
  const t = p.trim();
  if (t.length < 20) return false;
  if (t.endsWith("?")) return true;
  // Comandos típicos terminam com ":" ou com construções abertas tipo "introduz a ideia de"
  if (/:\s*$/.test(t) && t.length < 350) return true;
  return PROMPT_PATTERNS.some((re) => re.test(t));
}

function detectPoem(paragraph: string): boolean {
  const lines = paragraph.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  const avgLen = lines.reduce((a, l) => a + l.length, 0) / lines.length;
  if (avgLen > 65) return false;
  // poemas/letras raramente terminam em "."
  const endsInPeriod = lines.filter((l) => /[.!?]$/.test(l)).length;
  const ratioPeriod = endsInPeriod / lines.length;
  // Maioria das linhas curtas começam com maiúscula
  const startsUpper = lines.filter((l) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(l)).length;
  const ratioUpper = startsUpper / lines.length;
  return ratioPeriod < 0.4 && ratioUpper > 0.55;
}

function detectQuote(paragraph: string): boolean {
  const t = paragraph.trim();
  if (t.length < 20 || t.length > 600) return false;
  if (/^["“]/.test(t) && /["”]\s*[—\-–][^\n]+$/.test(t)) return true;
  if (/\n\s*[—\-–]\s+[A-Z]/.test(t)) return true;
  return false;
}

function splitParagraphs(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n");
  // 1) split por parágrafos "fortes" (linha em branco)
  let paras = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  // 2) Se vier tudo num parágrafo só mas com várias linhas curtas (típico de
  //    letras de música/poemas extraídos sem dupla-quebra), tentar isolar o
  //    bloco "tipo poema" e separar do resto do texto.
  const refined: string[] = [];
  for (const p of paras) {
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 4) { refined.push(p); continue; }
    const avg = lines.reduce((a, l) => a + l.length, 0) / lines.length;
    const shortRatio = lines.filter((l) => l.length <= 70).length / lines.length;
    // Bloco majoritariamente curto → tratar cada "região" curta como um parágrafo
    if (avg <= 60 && shortRatio >= 0.7) {
      // Junta linhas longas (provável prosa / comando) em parágrafos próprios,
      // mantém as curtas como o bloco poético.
      let buf: string[] = [];
      let mode: "poem" | "prose" | null = null;
      const flush = () => {
        if (!buf.length) return;
        refined.push(buf.join(mode === "poem" ? "\n" : " ").trim());
        buf = [];
      };
      for (const l of lines) {
        const isShort = l.length <= 70 && !/[.!?]$/.test(l);
        const next: "poem" | "prose" = isShort ? "poem" : "prose";
        if (mode && next !== mode) flush();
        mode = next;
        buf.push(l);
      }
      flush();
    } else {
      refined.push(p);
    }
  }
  return refined;
}

export function parseQuestionBlocks(raw: string): Block[] {
  if (!raw) return [];
  const paragraphs = splitParagraphs(raw);
  const blocks: Block[] = [];
  let pendingLabel: string | undefined;

  // Identifica o último parágrafo "prompt" — é o comando da questão
  let promptIdx = -1;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (isLikelyPrompt(paragraphs[i])) { promptIdx = i; break; }
  }
  // Fallback: o último parágrafo costuma ser o enunciado em questões com
  // alternativas. Aceita até 500 chars (comandos do ENEM podem ser longos).
  if (promptIdx === -1 && paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1];
    if (last.length < 500) promptIdx = paragraphs.length - 1;
  }
  // Última cartada: se nada foi marcado e só existe 1 parágrafo, ainda assim
  // tentamos extrair a "última frase" como prompt destacado.
  if (promptIdx === -1 && paragraphs.length === 1) {
    const only = paragraphs[0];
    // Procura a última fronteira de sentença razoável
    const m = only.match(/([^.!?\n]{20,400})\s*$/);
    if (m && m[1] && m[1].trim().length < only.length - 40) {
      const tail = m[1].trim();
      const head = only.slice(0, only.length - tail.length).trim();
      if (head.length > 30) {
        paragraphs[0] = head;
        paragraphs.push(tail);
        promptIdx = 1;
      }
    }
  }

  paragraphs.forEach((p, i) => {
    if (TEXT_LABEL_RE.test(p)) { pendingLabel = p.replace(/[:\-–]\s*$/, "").trim(); return; }
    const label = pendingLabel; pendingLabel = undefined;

    if (i === promptIdx) {
      blocks.push({ kind: "prompt", text: p, label });
      return;
    }
    if (detectPoem(p)) { blocks.push({ kind: "poem", text: p, label }); return; }
    if (detectQuote(p)) { blocks.push({ kind: "quote", text: p, label }); return; }
    blocks.push({ kind: "prose", text: p, label });
  });

  return blocks;
}

// ────────────────────────────────────────────────────────────────────────────────
// Componentes visuais
// ────────────────────────────────────────────────────────────────────────────────

function BlockLabel({ label, kind }: { label: string; kind: BlockKind }) {
  const Icon = kind === "poem" ? Music : kind === "quote" ? Quote : FileText;
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ProseBlock({ block }: { block: Block }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = block.text.length > 900;
  const showCollapse = isLong && !expanded;
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-5 py-5 sm:px-7 sm:py-6">
      {block.label && <BlockLabel label={block.label} kind={block.kind} />}
      <MathText
        className={`block text-[16px] leading-[1.85] text-foreground/90 whitespace-pre-wrap break-words [text-wrap:pretty] ${
          showCollapse ? "max-h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" : ""
        }`}
      >
        {block.text}
      </MathText>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Recolher texto" : "Mostrar texto completo"}
        </button>
      )}
    </div>
  );
}

function PoemBlock({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-border bg-amber-50/40 dark:bg-amber-950/10 px-6 py-6 sm:px-8 sm:py-7">
      {block.label && <BlockLabel label={block.label} kind="poem" />}
      <pre className="font-serif text-[16px] leading-[2.05] text-foreground/90 whitespace-pre-wrap break-words m-0 [font-feature-settings:'liga','onum']">
        {block.text}
      </pre>
    </div>
  );
}

function QuoteBlock({ block }: { block: Block }) {
  return (
    <blockquote className="relative rounded-2xl border-l-4 border-primary/60 bg-muted/30 pl-6 pr-5 py-5">
      {block.label && <BlockLabel label={block.label} kind="quote" />}
      <MathText className="block font-serif italic text-[16px] leading-[1.9] text-foreground/90 whitespace-pre-wrap break-words">
        {block.text}
      </MathText>
    </blockquote>
  );
}

function PromptBlock({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] px-6 py-6 sm:px-7 sm:py-7">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">?</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Pergunta
        </span>
      </div>
      <MathText className="block text-[17px] sm:text-[18px] leading-[1.75] font-semibold text-foreground whitespace-pre-wrap break-words [text-wrap:pretty]">
        {block.text}
      </MathText>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Imagens (centralizadas, bordas arredondadas, botão expandir)
// ────────────────────────────────────────────────────────────────────────────────

export function QuestionImagesV2({ urls, label }: { urls: string[]; label: string }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!urls?.length) return null;

  return (
    <>
      <div className="space-y-3">
        {urls.map((url, i) => (
          <figure key={i} className="rounded-2xl overflow-hidden border border-border bg-muted/20 group relative">
            <button
              onClick={() => setZoom(url)}
              className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label="Expandir imagem"
              title="Expandir"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <img
              src={url}
              alt={`${label} — imagem ${i + 1}`}
              loading="lazy"
              className="w-full h-auto object-contain max-h-[460px] mx-auto bg-white dark:bg-zinc-900 cursor-zoom-in"
              onClick={() => setZoom(url)}
            />
            <figcaption className="px-3 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border bg-card/60">
              <ImageIcon className="w-3 h-3" />
              Imagem da prova {urls.length > 1 ? `(${i + 1}/${urls.length})` : ""}
            </figcaption>
          </figure>
        ))}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={() => setZoom(null)}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoom}
            alt={label}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Renderer principal
// ────────────────────────────────────────────────────────────────────────────────

export function QuestionRenderer({
  enunciado,
  imagens,
  label,
  wide = false,
}: {
  enunciado: string;
  imagens?: string[];
  label: string;
  wide?: boolean;
}) {
  const blocks = parseQuestionBlocks(enunciado);
  const promptIndex = blocks.findIndex((b) => b.kind === "prompt");
  const supportBlocks = promptIndex >= 0 ? blocks.slice(0, promptIndex) : blocks;
  const promptBlock = promptIndex >= 0 ? blocks[promptIndex] : null;

  const totalLen = enunciado?.length ?? 0;
  const isLong = totalLen > 1200 || supportBlocks.length >= 3;
  const hasImages = !!imagens?.length;

  return (
    <article className={`${wide ? "max-w-3xl" : "max-w-[680px]"} mx-auto w-full space-y-6 sm:space-y-8`}>
      {isLong && (
        <nav aria-label="Estrutura da questão" className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
          {supportBlocks.length > 0 && (
            <a href="#q-apoio" className="px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors">Texto de apoio</a>
          )}
          {hasImages && (
            <>
              <span aria-hidden>→</span>
              <a href="#q-imagens" className="px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors">Imagem</a>
            </>
          )}
          {promptBlock && (
            <>
              <span aria-hidden>→</span>
              <a href="#q-pergunta" className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors">Pergunta</a>
            </>
          )}
          <span aria-hidden>→</span>
          <a href="#q-alternativas" className="px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors">Alternativas</a>
        </nav>
      )}

      {supportBlocks.length > 0 && (
        <section id="q-apoio" className="space-y-5 scroll-mt-20">
          <header className="flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Texto de apoio</span>
            <span className="h-px flex-1 bg-border" />
          </header>
          {supportBlocks.map((b, i) => {
            if (b.kind === "poem") return <PoemBlock key={i} block={b} />;
            if (b.kind === "quote") return <QuoteBlock key={i} block={b} />;
            return <ProseBlock key={i} block={b} />;
          })}
        </section>
      )}

      {hasImages && (
        <section id="q-imagens" className="scroll-mt-20">
          <QuestionImagesV2 urls={imagens!} label={label} />
        </section>
      )}

      {promptBlock && (
        <section id="q-pergunta" className="scroll-mt-20">
          <PromptBlock block={promptBlock} />
        </section>
      )}
      {!promptBlock && supportBlocks.length === 0 && enunciado && (
        <MathText className="block text-[16px] leading-[1.8] text-foreground whitespace-pre-wrap break-words">
          {enunciado}
        </MathText>
      )}
    </article>
  );
}