import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkQuota, logAIUsage, quotaExceededResponse } from "../_shared/usage.ts";
import {
  type CallOptions,
  callGemini,
  callGroq,
  callMistral,
  callCerebras,
  callDeepSeek,
  callOpenAI,
  callLovable,
  runChain,
  runChainEx,
  parseAIJSON,
} from "../_shared/providers.ts";

// ─── Cadeia para REDAÇÃO ──────────────────────────────────────────────────────
// Gemini 2.5 Flash Preview como primário (melhor nuance em texto longo PT-BR)
// Fallback completo para garantir disponibilidade
function buildEssayChain(opts: CallOptions): Array<[string, () => Promise<string>]> {
  const k1 = Deno.env.get("GEMINI_API_KEY") ?? "";
  const k2 = Deno.env.get("GEMINI_API_KEY_2") ?? "";
  return [
    ["gemini_25_preview",   () => callGemini(opts, k1, "gemini-2.5-flash-preview-04-17")],
    ["gemini_25_preview_2", () => callGemini(opts, k2, "gemini-2.5-flash-preview-04-17")],
    ["gemini",              () => callGemini(opts, k1, "gemini-2.0-flash")],
    ["gemini_2",            () => callGemini(opts, k2, "gemini-2.0-flash")],
    ["groq",                () => callGroq(opts)],
    ["mistral",             () => callMistral(opts)],
    ["cerebras",            () => callCerebras(opts)],
    ["deepseek",            () => callDeepSeek(opts)],
    ["openai",              () => callOpenAI(opts)],
    ["lovable",             () => callLovable(opts)],
  ];
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Objetivo = "enem" | "vestibular" | "concurso" | "faculdade" | "aprender" | string;

interface ParagrafoAnalise { diagnostico: string; sugestao_reescrita: string; }

interface CorrectionResultENEM {
  tipo_textual: string;
  fuga_tipo_textual: boolean;
  aderencia_tema: "dentro" | "tangencia" | "fuga_total";
  aderencia_justificativa: string;
  competencia_1: number;
  competencia_2: number;
  competencia_3: number;
  competencia_4: number;
  competencia_5: number;
  nota_total: number;
  feedback_geral: string;
  feedback_competencias: Record<string, string>;
  analise_paragrafos: {
    introducao: ParagrafoAnalise;
    desenvolvimento_1: ParagrafoAnalise;
    desenvolvimento_2: ParagrafoAnalise;
    conclusao: ParagrafoAnalise;
  };
  plano_estudo?: {
    diagnostico: string[];
    curto_prazo: string[];
    medio_prazo: string[];
    treino_direcionado: string;
    dica_estrategica: string;
  };
}

interface CorrectionResultGeral {
  nota: number;
  nota_maxima: 10;
  nivel: string;
  feedback_geral: string;
  feedback_criterios: { clareza: string; argumentacao: string; norma_culta: string; estrutura: string; };
  analise_paragrafos: {
    introducao: ParagrafoAnalise;
    desenvolvimento_1: ParagrafoAnalise;
    desenvolvimento_2: ParagrafoAnalise;
    conclusao: ParagrafoAnalise;
  };
  proximos_passos: string[];
  plano_estudo?: {
    diagnostico: string[];
    curto_prazo: string[];
    medio_prazo: string[];
    treino_direcionado: string;
    dica_estrategica: string;
  };
}

// ─── System prompt ENEM ───────────────────────────────────────────────────────
// Correções em relação à versão anterior:
// 1. Hierarquia clara: critérios objetivos PRIMEIRO, tolerâncias DEPOIS
// 2. Sem mensagens contraditórias ("200 exige excelência" vs "não dê 160 por segurança")
// 3. Regra de ouro explícita: pergunte "o texto FALHA ou apenas poderia melhorar?"
// 4. Exemplos concretos do que sobe/desce nota para cada competência
const SYSTEM_ENEM = `Você é Flora, corretora especializada no ENEM. Corrija no padrão REAL da banca avaliadora do INEP.

ESCALA OBRIGATÓRIA: cada competência recebe SOMENTE 0, 40, 80, 120, 160 ou 200. Nunca valores intermediários.

REGRA DE OURO (aplique antes de qualquer nota):
Pergunte: "O texto FALHA nessa competência ou apenas poderia ser melhorado?"
— Se FALHA (há problema real que compromete leitura, argumentação ou proposta): reduza a nota.
— Se só PODERIA MELHORAR (possibilidade de refinamento, mais sofisticação, mais variedade): mantenha 200.
Nunca reduza de 200 para 160 por sugestão de melhoria. Só reduza por falha perceptível e relevante.

━━━ COMPETÊNCIA 1 — NORMA CULTA ━━━
Critérios objetivos por nota:
200 → texto formal, bem escrito. Até 2 deslizes leves e isolados são tolerados (crase isolada, vírgula trocada, repetição pontual de palavra). Texto flui e comunicação é eficaz.
160 → erros perceptíveis e recorrentes que aparecem em 2 ou mais parágrafos. Ou 1 erro mais grave (concordância, regência, ortografia de palavra comum).
120 → vários erros ao longo do texto, comprometendo a leitura em partes.
80 → muitos erros, leitura prejudicada.
40 → desvios graves generalizados.
0 → ilegível ou texto em branco.
NÃO reduza C1 por: variação de vocabulário, repetição pontual, possibilidade de tornar frase mais concisa, escolha de conectivo simples. Esses são critérios de estilo, não de norma culta.

━━━ COMPETÊNCIA 2 — TEMA E REPERTÓRIO ━━━
200 → compreende plenamente o tema com recorte claro, tese bem definida, repertório pertinente e PRODUTIVO (articulado com o argumento, não decorativo). Repertório pode ser obra literária, filme, dado histórico, pesquisador, lei — desde que bem integrado.
160 → compreende bem o tema, mas repertório menos integrado (citado mas não articulado) ou tese menos precisa.
120 → compreensão limitada do recorte temático ou repertório raso/desconexo.
80 → tangencia o tema (trata de assunto próximo mas não do recorte exato). C2 máx 80.
40 → abordagem muito superficial sem desenvolver o tema.
0 → fuga total ao tema ou fuga ao tipo textual (zera também C3, C4, C5).

━━━ COMPETÊNCIA 3 — ARGUMENTAÇÃO ━━━
200 → tese clara e bem defendida, 2+ argumentos desenvolvidos com relações de causa-consequência ou exemplificação concreta, progressão lógica entre parágrafos, argumentos se sustentam sem contradição.
160 → boa argumentação mas com aprofundamento limitado em pelo menos 1 argumento, ou progressão com 1 ruptura perceptível.
120 → argumentação mediana, argumentos existem mas são pouco desenvolvidos.
80 → argumentação frágil, ideia central existe mas argumentos não se sustentam.
40 → quase sem projeto argumentativo.
0 → sem argumentação ou fuga ao tipo textual.
NÃO exija brilhantismo acadêmico para 200. Consistência + progressão lógica + 2 bons argumentos = 200 possível.

━━━ COMPETÊNCIA 4 — COESÃO ━━━
200 → texto articulado e fluido, conectivos funcionam e são suficientemente variados, referenciação correta, progressão temática clara entre parágrafos. Conectivos simples como "além disso", "portanto", "nesse sentido" já são suficientes SE o texto flui bem.
160 → boa coesão, mas com repetição perceptível e recorrente das mesmas estruturas/conectivos ao longo de 3+ parágrafos, ou 1-2 rupturas de progressão temática.
120 → coesão mediana, problemas frequentes de articulação.
80 → problemas graves e frequentes de coesão.
40 → coesão muito fraca.
0 → ausência de coesão ou fuga ao tipo textual.
Pergunta central para C4: "O texto flui? As ideias se conectam?" Se sim: 200. Só reduza se houver prejuízo REAL na fluidez ou na compreensão do encadeamento.

━━━ COMPETÊNCIA 5 — PROPOSTA DE INTERVENÇÃO ━━━
200 → proposta com TODOS os 5 elementos: agente (quem executa) + ação (o que faz) + meio/modo (como faz) + finalidade (para quê) + detalhamento (como o elemento anterior se desdobra). Não precisa ser complexo, precisa ser claro e completo. Deve respeitar os direitos humanos. Para textos curtos (≤250 palavras), avalie proporcionalmente — um texto de 15 linhas não tem espaço para detalhar 5 elementos com a mesma profundidade de um de 30 linhas.
160 → proposta válida mas com 1 elemento ausente ou pouco desenvolvido (ex: meio/modo vago ou finalidade genérica).
120 → proposta genérica, faltam 2+ elementos.
80 → proposta vaga ou muito fraca.
40 → quase sem proposta.
0 → sem proposta, proposta que viola direitos humanos, ou fuga ao tipo textual.

━━━ DETECÇÃO OBRIGATÓRIA ━━━
ETAPA 1 — GÊNERO TEXTUAL: se não for dissertativo-argumentativo → fuga_tipo_textual=true → C2=C3=C4=C5=0.
ETAPA 2 — ADERÊNCIA AO TEMA:
  "dentro" → desenvolveu o recorte temático proposto.
  "tangencia" → tratou de assunto próximo mas não do recorte exato → C2 e C3 máx 80.
  "fuga_total" → ignorou o tema → C2=C3=0.
ETAPA 3 — IDENTIFICAR os 4 blocos: introdução, desenvolvimento 1, desenvolvimento 2, conclusão.

━━━ ANÁLISE POR PARÁGRAFO ━━━
Para cada bloco: diagnostico (2-3 frases citando trecho específico do texto) + sugestao_reescrita (reescreva LITERALMENTE 1-2 frases mostrando como ficaria melhor — não dê conselho genérico, dê o texto pronto). Mesmo em redações nota 1000, aponte refinamentos avançados.
Varie o início das sugestões: "Uma forma mais precisa seria...", "Pode-se reformular para...", "Uma versão mais sofisticada seria...", "Sugere-se...", "Uma alternativa mais autoral seria...".

━━━ PLANO DE ESTUDO PERSONALIZADO ━━━
Gere "plano_estudo" baseado nas FRAGILIDADES REAIS desta redação (nunca genérico):
- diagnostico: array 2-4 strings — pontos centrais a melhorar
- curto_prazo: array 3-5 strings — ações concretas para 3-7 dias
- medio_prazo: array 3-5 strings — ações para 2 semanas
- treino_direcionado: string — 1 exercício prático ligado ao maior gap identificado
- dica_estrategica: string — 1 orientação motivadora calibrada ao nível real do aluno

Retorne SOMENTE JSON válido (sem markdown, sem texto fora do JSON):
{"tipo_textual":"...","fuga_tipo_textual":false,"aderencia_tema":"dentro","aderencia_justificativa":"...","competencia_1":0,"competencia_2":0,"competencia_3":0,"competencia_4":0,"competencia_5":0,"nota_total":0,"feedback_geral":"...","feedback_competencias":{"competencia_1":"...","competencia_2":"...","competencia_3":"...","competencia_4":"...","competencia_5":"..."},"analise_paragrafos":{"introducao":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_1":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_2":{"diagnostico":"...","sugestao_reescrita":"..."},"conclusao":{"diagnostico":"...","sugestao_reescrita":"..."}},"plano_estudo":{"diagnostico":["..."],"curto_prazo":["..."],"medio_prazo":["..."],"treino_direcionado":"...","dica_estrategica":"..."}}`;

const PLANO_BLOCK = `Inclua também "plano_estudo" personalizado pela redação: diagnostico (array 2-4 fragilidades reais), curto_prazo (array 3-5 ações para 3-7 dias), medio_prazo (array 3-5 ações para 2 semanas), treino_direcionado (1 exercício prático ligado ao maior gap), dica_estrategica (1 orientação motivadora estilo professor). Linguagem clara, direta, motivadora sem exagero.`;

const SYSTEM_CONCURSO = `Você é Flora, corretora de redações para concursos públicos (padrão CESPE/FCC/Vunesp).
Critérios (0-2.5 cada, total 0-10): clareza_objetividade | argumentacao_fundamentacao | norma_culta | estrutura_textual
Análise por parágrafo: diagnostico (2-3 frases citando trecho) + sugestao_reescrita literal.
${PLANO_BLOCK}
Retorne SOMENTE JSON: {"nota":0,"nota_maxima":10,"nivel":"...","feedback_geral":"...","feedback_criterios":{"clareza":"...","argumentacao":"...","norma_culta":"...","estrutura":"..."},"analise_paragrafos":{"introducao":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_1":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_2":{"diagnostico":"...","sugestao_reescrita":"..."},"conclusao":{"diagnostico":"...","sugestao_reescrita":"..."}},"proximos_passos":["...","...","..."],"plano_estudo":{"diagnostico":["..."],"curto_prazo":["..."],"medio_prazo":["..."],"treino_direcionado":"...","dica_estrategica":"..."}}`;

const SYSTEM_FACULDADE = `Você é Flora, professora de produção textual acadêmica.
Critérios (0-2.5 cada, total 0-10): clareza_coerencia | argumentacao | norma_culta | estrutura_coesao
Análise por parágrafo: diagnostico (2-3 frases citando trecho) + sugestao_reescrita literal.
${PLANO_BLOCK}
Retorne SOMENTE JSON: {"nota":0,"nota_maxima":10,"nivel":"...","feedback_geral":"...","feedback_criterios":{"clareza":"...","argumentacao":"...","norma_culta":"...","estrutura":"..."},"analise_paragrafos":{"introducao":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_1":{"diagnostico":"...","sugestao_reescrita":"..."},"desenvolvimento_2":{"diagnostico":"...","sugestao_reescrita":"..."},"conclusao":{"diagnostico":"...","sugestao_reescrita":"..."}},"proximos_passos":["...","...","..."],"plano_estudo":{"diagnostico":["..."],"curto_prazo":["..."],"medio_prazo":["..."],"treino_direcionado":"...","dica_estrategica":"..."}}`;

// Estilos específicos por banca de concurso. Quando a banca está definida, anexamos um bloco
// orientando a Flora a calibrar a correção segundo as exigências reais da banca.
const BANCA_STYLE: Record<string, string> = {
  CESPE: `BANCA: CESPE/Cebraspe — texto dissertativo CURTO (até 30 linhas). Exige objetividade extrema, frases concisas, vocabulário formal sem rebuscamento, conectivos precisos. Penalize: prolixidade, redundância, fuga ao recorte do comando, marcas de oralidade. Valorize: tese clara já no 1º parágrafo, argumento por dado/lei/princípio, fechamento que retoma a tese.`,
  CEBRASPE: `BANCA: CESPE/Cebraspe — texto dissertativo CURTO (até 30 linhas). Exige objetividade extrema, frases concisas, vocabulário formal sem rebuscamento, conectivos precisos. Penalize: prolixidade, redundância, fuga ao recorte do comando, marcas de oralidade. Valorize: tese clara já no 1º parágrafo, argumento por dado/lei/princípio, fechamento que retoma a tese.`,
  FCC: `BANCA: FCC — dissertativo-argumentativo. Exige norma culta rigorosa, paragrafação clara (intro/desenvolvimento/conclusão), uso de repertório sociocultural pertinente. Penalize com mais peso desvios gramaticais e falta de coesão; cobre estrutura formal.`,
  VUNESP: `BANCA: Vunesp — dissertativo-argumentativo padrão. Cobra clareza, objetividade, norma culta e progressão temática. Penalize argumentos genéricos sem fundamentação; valorize encadeamento lógico.`,
  FGV: `BANCA: FGV — exige argumentação técnica e analítica. Valorize raciocínio crítico, dados, precisão conceitual; penalize generalizações e juízo de valor sem fundamento.`,
  IBFC: `BANCA: IBFC — dissertativo-argumentativo objetivo. Foco em clareza, norma culta e argumentação coerente.`,
  QUADRIX: `BANCA: Quadrix — dissertativo objetivo. Foco em norma culta, clareza e estrutura.`,
};

function normalizeBanca(banca: string): string {
  return banca
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/CESPECEBRASPE|CESPEUNB/, "CESPE");
}

function getBancaBlock(banca: string): string {
  const key = normalizeBanca(banca);
  if (!key) return "";
  // Match por prefixo (ex.: "CESPECEBRASPE" → "CESPE")
  const found = Object.keys(BANCA_STYLE).find((k) => key.startsWith(k));
  return found ? `\n\n${BANCA_STYLE[found]}\n` : `\n\nBANCA: ${banca} — calibre a correção pelo estilo característico dessa banca (formato, exigências de norma culta, tipo de argumentação esperada).\n`;
}

// Tipos técnicos de redação cobrados em concursos públicos.
// Quando o aluno indica o tipo (ex.: ofício, parecer, exposição de motivos),
// substituímos o critério "estrutura_textual" pelas exigências formais do gênero.
const TIPO_TECNICO_BLOCK: Record<string, string> = {
  oficio: `\n\nGÊNERO: OFÍCIO (Manual de Redação Oficial – Padrão Ofício).
ESTRUTURA OBRIGATÓRIA — penalize ausência ou inversão:
1) Cabeçalho com identificação do órgão; 2) Tipo+nº+ano (ex.: Ofício nº 123/2025/SETOR); 3) Local e data; 4) Endereçamento (vocativo: "Senhor/Senhora + cargo,"); 5) Assunto (resumo conciso); 6) Texto (introdução, desenvolvimento, conclusão objetivos); 7) Fecho ("Atenciosamente,/Respeitosamente,"); 8) Assinatura + cargo.
ESTILO: impessoalidade, formalidade, uniformidade, concisão, clareza. PROIBIDO: 1ª pessoa do singular, gírias, marcas de oralidade. USE: 1ª pessoa do plural ou voz impessoal.
No critério "estrutura" avalie aderência ao Padrão Ofício; em "norma_culta" o vocabulário oficial.`,
  parecer: `\n\nGÊNERO: PARECER TÉCNICO/JURÍDICO.
ESTRUTURA OBRIGATÓRIA — penalize ausência:
1) Ementa (resumo em 1-2 frases); 2) Relatório (fatos, processo, peças); 3) Fundamentação (norma aplicável, doutrina, jurisprudência citada com fonte); 4) Conclusão objetiva (opinativa) com recomendação clara.
ESTILO: impessoal, técnico, fundamentado em fontes verificáveis. Cada afirmação relevante deve ser sustentada por base normativa, doutrinária ou fática. Penalize: opiniões pessoais sem fundamento; recomendações vagas; ausência de citação de norma.
No critério "estrutura" avalie a divisão Ementa→Relatório→Fundamentação→Conclusão; em "argumentacao" a robustez técnica e o uso de fontes.`,
  exposicao_motivos: `\n\nGÊNERO: EXPOSIÇÃO DE MOTIVOS (EM).
ESTRUTURA OBRIGATÓRIA: identificação do órgão e nº; destinatário (Presidente da República, Ministro etc.); diagnóstico do problema; justificativa da medida proposta; síntese do ato/projeto sugerido; impactos esperados; fecho protocolar.
ESTILO: impessoal, fundamentado em dados, com clareza dos motivos políticos/administrativos. Penalize: ausência de justificativa objetiva; falta de quantificação do problema; conclusão sem recomendação clara.
No critério "estrutura" avalie a sequência diagnóstico→justificativa→proposta→impactos.`,
  relatorio: `\n\nGÊNERO: RELATÓRIO TÉCNICO.
ESTRUTURA OBRIGATÓRIA: introdução (objeto/objetivo); desenvolvimento (metodologia, dados, análise); conclusão (síntese e recomendações).
ESTILO: impessoal, baseado em dados verificáveis, ordenação cronológica/lógica. Penalize: opinião pessoal não justificada; ausência de dados; conclusão dissociada do desenvolvimento.`,
};

function getTipoTecnicoBlock(tipoTexto: string): string {
  const k = tipoTexto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z_]/g, "");
  if (!k || k === "dissertativo" || k === "dissertativa" || k === "argumentativa") return "";
  if (k.startsWith("oficio")) return TIPO_TECNICO_BLOCK.oficio;
  if (k.startsWith("parecer")) return TIPO_TECNICO_BLOCK.parecer;
  if (k.includes("exposicao") || k === "em" || k.includes("motivos")) return TIPO_TECNICO_BLOCK.exposicao_motivos;
  if (k.startsWith("relatorio")) return TIPO_TECNICO_BLOCK.relatorio;
  return "";
}

function getSystemPrompt(objetivo: Objetivo, banca = "", tipoTexto = ""): string {
  if (objetivo === "enem" || objetivo === "vestibular") return SYSTEM_ENEM;
  if (objetivo === "concurso") return SYSTEM_CONCURSO + getBancaBlock(banca) + getTipoTecnicoBlock(tipoTexto);
  return SYSTEM_FACULDADE;
}

// ─── Parse JSON robusto ───────────────────────────────────────────────────────
// Gemini 2.5 Flash Preview às vezes trunca ou adiciona prefixo mesmo com jsonMode.
// Estratégia em camadas: parse direto → limpar markdown → extrair primeiro { ... }
function robustParseJSON(raw: string): unknown {
  // 1. Tenta direto
  try { return JSON.parse(raw); } catch { /* continua */ }

  // 2. Remove blocos markdown
  const cleaned = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  try { return JSON.parse(cleaned); } catch { /* continua */ }

  // 3. Extrai o maior bloco { ... } balanceado
  let depth = 0;
  let start = -1;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* continua */ }
  }

  // 4. Tenta reparar JSON truncado adicionando chaves/colchetes faltantes
  try {
    let attempt = cleaned;
    const openBraces = (attempt.match(/\{/g) || []).length;
    const closeBraces = (attempt.match(/\}/g) || []).length;
    const openBracks = (attempt.match(/\[/g) || []).length;
    const closeBracks = (attempt.match(/\]/g) || []).length;
    // Fecha strings abertas
    if (inStr) attempt += '"';
    // Fecha arrays e objetos pendentes
    for (let i = 0; i < openBracks - closeBracks; i++) attempt += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) attempt += "}";
    return JSON.parse(attempt);
  } catch { /* continua */ }

  throw new Error(`Não foi possível extrair JSON. Raw (200 chars): ${raw.slice(0, 200)}`);
}

// ─── Lógica de correção ───────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function generateTheme(objetivo: Objetivo): Promise<{ tema: string; provider: string }> {
  const ctx =
    objetivo === "enem" || objetivo === "vestibular"
      ? "ENEM/vestibular — dissertativo-argumentativo atual e relevante"
      : objetivo === "concurso"
      ? "concurso público — atualidades, cidadania ou administração pública"
      : "produção textual — tema atual e interessante";
  const opts: CallOptions = {
    messages: [
      {
        role: "system",
        content: `Sugira UM tema de redação para ${ctx}. Responda apenas com o tema em uma frase, sem aspas, sem prefixos, sem explicação.`,
      },
      { role: "user", content: "Sugira um tema." },
    ],
    temperature: 0.9,
    maxTokens: 80,
  };
  const k1 = Deno.env.get("GEMINI_API_KEY") ?? "";
  const k2 = Deno.env.get("GEMINI_API_KEY_2") ?? "";
  const chain: Array<[string, () => Promise<string>]> = [
    ["gemini_25_preview",   () => callGemini(opts, k1, "gemini-2.5-flash-preview-04-17")],
    ["gemini_25_preview_2", () => callGemini(opts, k2, "gemini-2.5-flash-preview-04-17")],
    ["gemini",              () => callGemini(opts, k1, "gemini-2.0-flash")],
    ["gemini_2",            () => callGemini(opts, k2, "gemini-2.0-flash")],
    ["groq",                () => callGroq(opts)],
    ["mistral",             () => callMistral(opts)],
    ["cerebras",            () => callCerebras(opts)],
    ["deepseek",            () => callDeepSeek(opts)],
    ["openai",              () => callOpenAI(opts)],
    ["lovable",             () => callLovable(opts)],
  ];
  const { result: content, provider } = await runChainEx(chain, "essay:theme");
  return { tema: content.trim().replace(/^["']|["']$/g, ""), provider };
}

function normalizeENEMCorrection(parsed: any): any {
  // Garante que as notas estão na escala correta (múltiplos de 40, 0-200)
  const snapTo40 = (n: number): number => {
    const v = Math.max(0, Math.min(200, Math.round(Number(n) / 40) * 40));
    return Number.isFinite(v) ? v : 0;
  };
  parsed.competencia_1 = snapTo40(parsed.competencia_1);
  parsed.competencia_2 = snapTo40(parsed.competencia_2);
  parsed.competencia_3 = snapTo40(parsed.competencia_3);
  parsed.competencia_4 = snapTo40(parsed.competencia_4);
  parsed.competencia_5 = snapTo40(parsed.competencia_5);

  // Aplica penalidades oficiais do INEP
  if (parsed.fuga_tipo_textual === true) {
    parsed.competencia_2 = 0;
    parsed.competencia_3 = 0;
    parsed.competencia_4 = 0;
    parsed.competencia_5 = 0;
  } else if (parsed.aderencia_tema === "fuga_total") {
    parsed.competencia_2 = 0;
    parsed.competencia_3 = 0;
  } else if (parsed.aderencia_tema === "tangencia") {
    parsed.competencia_2 = Math.min(parsed.competencia_2, 80);
    parsed.competencia_3 = Math.min(parsed.competencia_3, 80);
  }

  parsed.nota_total =
    parsed.competencia_1 +
    parsed.competencia_2 +
    parsed.competencia_3 +
    parsed.competencia_4 +
    parsed.competencia_5;

  return parsed;
}

async function auditENEMCorrection(
  tema: string,
  texto: string,
  correction: any
): Promise<{ correction: any; audit: Record<string, unknown> }> {
  try {
    const opts: CallOptions = {
      messages: [
        {
          role: "system",
          content: `Você é uma segunda banca revisora ENEM/INEP. Sua tarefa é auditar a correção já feita, não reescrever todo o feedback.

Verifique:
1) notas C1-C5 estão na escala 0,40,80,120,160,200;
2) nota total bate com a soma;
3) fuga ao tipo textual, fuga total e tangência aplicam as penalidades corretas;
4) notas não estão generosas demais nem duras demais diante da rubrica.

Só ajuste uma competência se houver motivo claro e objetivo. Nunca invente problema. Retorne SOMENTE JSON válido:
{"aprovada":true,"ajustes":{"competencia_1":200,"competencia_2":200,"competencia_3":160,"competencia_4":200,"competencia_5":160},"justificativas":{"competencia_1":"...","competencia_2":"...","competencia_3":"...","competencia_4":"...","competencia_5":"..."},"resumo":"..."}`
        },
        {
          role: "user",
          content: `TEMA:\n${tema || "(sem tema definido)"}

REDAÇÃO DO ALUNO:
${texto}

CORREÇÃO INICIAL:
${JSON.stringify({
  tipo_textual: correction.tipo_textual,
  fuga_tipo_textual: correction.fuga_tipo_textual,
  aderencia_tema: correction.aderencia_tema,
  aderencia_justificativa: correction.aderencia_justificativa,
  competencia_1: correction.competencia_1,
  competencia_2: correction.competencia_2,
  competencia_3: correction.competencia_3,
  competencia_4: correction.competencia_4,
  competencia_5: correction.competencia_5,
  nota_total: correction.nota_total,
  feedback_competencias: correction.feedback_competencias,
}, null, 2)}`
        },
      ],
      temperature: 0.1,
      maxTokens: 1400,
      jsonMode: true,
    };

    const raw = await runChain(buildEssayChain(opts), "essay:audit_enem");
    const audit = robustParseJSON(raw) as any;
    const ajustes = audit?.ajustes ?? {};
    for (const key of ["competencia_1", "competencia_2", "competencia_3", "competencia_4", "competencia_5"]) {
      if (Number.isFinite(Number(ajustes[key]))) correction[key] = Number(ajustes[key]);
    }

    return {
      correction: normalizeENEMCorrection(correction),
      audit: {
        aplicada: true,
        aprovada: audit?.aprovada !== false,
        resumo: typeof audit?.resumo === "string" ? audit.resumo : "",
        justificativas: audit?.justificativas ?? {},
      },
    };
  } catch (error) {
    console.warn("essay audit failed:", error);
    return {
      correction: normalizeENEMCorrection(correction),
      audit: {
        aplicada: false,
        erro: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// ─── Auditoria dupla para concurso ────────────────────────────────────────────
// Segundo modelo revisa a nota 0-10 e o feedback_geral, ajustando se houver
// discrepância clara em relação aos critérios de banca/gênero.
async function auditConcursoCorrection(
  tema: string,
  texto: string,
  correction: any,
  banca = "",
  tipoTexto = ""
): Promise<{ correction: any; audit: Record<string, unknown> }> {
  try {
    const opts: CallOptions = {
      messages: [
        {
          role: "system",
          content: `Você é uma segunda banca revisora de redações para concurso público${banca ? ` (banca ${banca})` : ""}${tipoTexto ? ` — gênero: ${tipoTexto}` : ""}.
Audite a correção já feita: verifique se a nota 0-10 está coerente com clareza, argumentação, norma culta e estrutura. Confirme que o feedback aponta erros reais. Só ajuste se houver discrepância clara (ex.: nota generosa demais para texto com erros gramaticais grosseiros, ou nota dura demais para texto sólido).
Retorne SOMENTE JSON: {"aprovada":true,"nota_ajustada":7.5,"justificativa":"...","resumo":"..."}` ,
        },
        {
          role: "user",
          content: `TEMA: ${tema || "(sem tema)"}\n\nREDAÇÃO:\n${texto}\n\nCORREÇÃO INICIAL:\nNota: ${correction.nota} | Nível: ${correction.nivel}\nFeedback: ${correction.feedback_geral}\nCritérios: ${JSON.stringify(correction.feedback_criterios || {})}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 800,
      jsonMode: true,
    };
    const raw = await runChain(buildEssayChain(opts), "essay:audit_concurso");
    const audit = robustParseJSON(raw) as any;
    const notaAjustada = Number(audit?.nota_ajustada);
    const aprovada = audit?.aprovada !== false;
    if (!aprovada && Number.isFinite(notaAjustada)) {
      correction.nota = Math.max(0, Math.min(10, Math.round(notaAjustada * 10) / 10));
    }
    return {
      correction,
      audit: {
        aplicada: true,
        aprovada,
        nota_original: correction.nota,
        justificativa: typeof audit?.justificativa === "string" ? audit.justificativa : "",
        resumo: typeof audit?.resumo === "string" ? audit.resumo : "",
      },
    };
  } catch (error) {
    console.warn("concurso audit failed:", error);
    return {
      correction,
      audit: {
        aplicada: false,
        erro: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function correctEssay(
  tema: string,
  texto: string,
  objetivo: Objetivo,
  banca = "",
  tipoTexto = ""
): Promise<CorrectionResultENEM | CorrectionResultGeral> {
  const isENEM = objetivo === "enem" || objetivo === "vestibular";

  const opts: CallOptions = {
    messages: [
      { role: "system", content: getSystemPrompt(objetivo, banca, tipoTexto) },
      {
        role: "user",
        content: `TEMA: ${tema || "(sem tema definido)"}\n\nREDAÇÃO DO ALUNO:\n${texto}`,
      },
    ],
    // 0.2 = respostas consistentes e determinísticas
    // Correção de redação NÃO deve variar entre chamadas para o mesmo texto
    temperature: 0.2,
    maxTokens: 3500,
    jsonMode: true,
  };

  const chain = buildEssayChain(opts);
  const { result: raw, provider } = await runChainEx(chain, "essay:correct");

  // Parse robusto em camadas (lida com truncamento e prefixos do Gemini)
  const parsed = robustParseJSON(raw) as any;
  parsed._provider = provider;

  if (isENEM) {
    const normalized = normalizeENEMCorrection(parsed);
    const audited = await auditENEMCorrection(tema, texto, normalized);
    audited.correction._audit = audited.audit;
    return audited.correction as CorrectionResultENEM;
  } else {
    // Concurso / Faculdade: normaliza nota 0-10
    parsed.nota = Math.max(0, Math.min(10, Math.round(Number(parsed.nota) * 10) / 10));
    parsed.nota_maxima = 10;
    // Auditoria dupla para concurso (segundo modelo revisor)
    if (objetivo === "concurso") {
      const audited = await auditConcursoCorrection(tema, texto, parsed, banca, tipoTexto);
      parsed.nota = audited.correction.nota;
      parsed.feedback_geral = audited.correction.feedback_geral || parsed.feedback_geral;
      parsed._audit = audited.audit;
    }
    return parsed as CorrectionResultGeral;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // getUser() — mais confiável que getClaims()
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) return json({ error: "Sessão inválida" }, 401);
    const userId = user.id;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Objetivo do onboarding → adapta critérios de correção
    const { data: onboardingData } = await adminClient
      .from("student_onboarding")
      .select("objetivo, banca")
      .eq("user_id", userId)
      .maybeSingle();
    const objetivo: Objetivo = (onboardingData?.objetivo as Objetivo) || "enem";
    const banca: string = (onboardingData?.banca as string) || "";

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ── suggest_theme ──────────────────────────────────────────────────────
    if (action === "suggest_theme") {
      const quota = await checkQuota(adminClient, userId, "essay_theme");
      if (!quota.allowed) return quotaExceededResponse(quota, corsHeaders);

      const { tema, provider: themeProvider } = await generateTheme(objetivo);
      void logAIUsage(adminClient, {
        userId,
        actionType: "essay_theme",
        model: "essay_theme",
        provider: themeProvider,
        success: true,
      });
      return json({ data: { tema } });
    }

    // ── correct ────────────────────────────────────────────────────────────
    if (action === "correct") {
      const quota = await checkQuota(adminClient, userId, "essay_correct");
      if (!quota.allowed) return quotaExceededResponse(quota, corsHeaders);

      const essayId = body.essayId as string;
      const tema = (body.tema as string) ?? "";
      const tipoTexto = (body.tipoTexto as string) ?? "";
      // Limita a 4000 chars — redação ENEM raramente ultrapassa isso
      const textoOriginal = (body.texto as string) ?? "";
      const wasTruncated = textoOriginal.length > 4000;
      const texto = textoOriginal.slice(0, 4000);

      if (!texto.trim() || texto.trim().split(/\s+/).length < 50) {
        return json({ error: "Redação muito curta. Escreva pelo menos 50 palavras." }, 400);
      }

      const result = await correctEssay(tema, texto, objetivo, banca, tipoTexto) as any;
      const isENEM = objetivo === "enem" || objetivo === "vestibular";

      void logAIUsage(adminClient, {
        userId,
        actionType: "essay_correct",
        model: "essay_correct",
        provider: result?._provider ?? "unknown",
        tokensIn: texto.length,
        tokensOut: 2500,
        success: true,
      });

      // Monta updateData mantendo compatibilidade com a estrutura da tabela essays
      const updateData: Record<string, unknown> = {
        status: "corrigida",
        corrected_at: new Date().toISOString(),
      };

      if (isENEM) {
        updateData.competencia_1 = result.competencia_1;
        updateData.competencia_2 = result.competencia_2;
        updateData.competencia_3 = result.competencia_3;
        updateData.competencia_4 = result.competencia_4;
        updateData.competencia_5 = result.competencia_5;
        updateData.nota_total = result.nota_total;
        updateData.feedback_geral = result.feedback_geral;
        updateData.feedback_competencias = {
          ...result.feedback_competencias,
          _meta: {
            tipo_textual: result.tipo_textual,
            fuga_tipo_textual: result.fuga_tipo_textual,
            aderencia_tema: result.aderencia_tema,
            aderencia_justificativa: result.aderencia_justificativa,
            objetivo,
            plano_estudo: result.plano_estudo,
            auditoria_enem: result._audit,
          },
          _paragrafos: result.analise_paragrafos,
        };
      } else {
        // Concurso/Faculdade: mapeia nota 0-10 → 0-1000 para compat com coluna nota_total
        updateData.nota_total = Math.round(result.nota * 100);
        updateData.feedback_geral = result.feedback_geral;
        updateData.feedback_competencias = {
          competencia_1: result.feedback_criterios?.clareza || "",
          competencia_2: result.feedback_criterios?.argumentacao || "",
          competencia_3: result.feedback_criterios?.norma_culta || "",
          competencia_4: result.feedback_criterios?.estrutura || "",
          competencia_5: "",
          _meta: {
            objetivo,
            banca,
            tipo_texto: tipoTexto || "dissertativo",
            nota_original: result.nota,
            nota_maxima: result.nota_maxima,
            nivel: result.nivel,
            proximos_passos: result.proximos_passos,
            plano_estudo: result.plano_estudo,
            auditoria_concurso: result._audit,
          },
          _paragrafos: result.analise_paragrafos,
        };
      }

      const { error: updateError } = await callerClient
        .from("essays")
        .update(updateData as never)
        .eq("id", essayId)
        .eq("user_id", userId);

      if (updateError) return json({ error: updateError.message }, 500);
      return json({ data: result, truncated: wasTruncated });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error("essay-corrector error:", err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
