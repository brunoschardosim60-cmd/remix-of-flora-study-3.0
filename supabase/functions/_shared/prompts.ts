/**
 * _shared/prompts.ts
 * Centraliza system prompt, estilos de banca e schemas JSON
 * para geração de questões de concurso.
 */

export type Tipo = "multipla_escolha" | "certo_errado";

// ── System prompt único ──────────────────────────────────────────────────────
export const QUESTION_SYSTEM_PROMPT =
  "Você é um elaborador especialista em questões de concurso público brasileiro. " +
  "Gere questões realistas, tecnicamente corretas e com explicação didática detalhada " +
  "(mínimo 3 frases por explicação). " +
  "Nunca gere questões genéricas, ambíguas ou com mais de uma resposta correta. " +
  "Sempre em português brasileiro.";

// ── Estilo por banca ─────────────────────────────────────────────────────────
export function styleByBanca(banca: string): string {
  const b = (banca || "").trim().toLowerCase();
  if (b.includes("fgv"))
    return "Estilo FGV: enunciados longos, foco em interpretação de texto, raciocínio analítico e detalhes sutis. Alternativas plausíveis e bem elaboradas, exigindo leitura atenta.";
  if (b.includes("cebraspe") || b.includes("cespe"))
    return "Estilo Cebraspe: itens de Certo/Errado, com pegadinhas conceituais, troca sutil de palavras, generalizações indevidas e exceções. Alta exigência de precisão técnica.";
  if (b.includes("fcc"))
    return "Estilo FCC: enunciados diretos, foco em conhecimento técnico literal, decoreba e legislação. Alternativas curtas e objetivas, com pouca interpretação.";
  if (b.includes("vunesp"))
    return "Estilo Vunesp: equilibrado entre interpretação e técnica, enunciados claros, alternativas razoáveis, dificuldade média.";
  return "Estilo de banca de concurso público brasileiro, realista e técnico.";
}

// ── JSON Schema com minLength nas explicações ────────────────────────────────
export function schemaFor(tipo: Tipo) {
  if (tipo === "certo_errado") {
    return {
      type: "object",
      properties: {
        questoes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              afirmativa: { type: "string", minLength: 20 },
              correta: { type: "string", enum: ["certo", "errado"] },
              explicacao: { type: "string", minLength: 80 },
              feedbackErro: { type: "string", minLength: 30, description: "Feedback específico para o erro, caso o usuário selecione uma alternativa incorreta. Deve explicar o porquê da alternativa estar errada e reforçar o conceito correto." },
              tema: { type: "string" },
            },
            required: ["afirmativa", "correta", "explicacao"],
          },
        },
      },
      required: ["questoes"],
    };
  }
  return {
    type: "object",
    properties: {
      questoes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            enunciado: { type: "string", minLength: 20 },
            alternativas: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  letra: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                  texto: { type: "string", minLength: 5 },
                },
                required: ["letra", "texto"],
              },
            },
            correta: { type: "string", enum: ["A", "B", "C", "D", "E"] },
            explicacao: { type: "string", minLength: 80 },
            feedbackErro: { type: "string", minLength: 30, description: "Feedback específico para o erro, caso o usuário selecione uma alternativa incorreta. Deve explicar o porquê da alternativa estar errada e reforçar o conceito correto." },
            tema: { type: "string" },
          },
          required: ["enunciado", "alternativas", "correta", "explicacao"],
        },
      },
    },
    required: ["questoes"],
  };
}

// ── Builder de prompt ─────────────────────────────────────────────────────────
export function buildPrompt(params: {
  banca: string;
  materia: string;
  assunto: string;
  quantidade: number;
  nivel: string;
  tipo: Tipo;
  orgao?: string;
  cargo?: string;
  focoErros?: string;   // bloco já formatado (opcional)
  antiDup?: string;     // bloco anti-duplicata (opcional)
}): string {
  const { banca, materia, assunto, quantidade, nivel, tipo, orgao, cargo, focoErros = "", antiDup = "" } = params;
  const estilo = styleByBanca(banca);

  if (tipo === "certo_errado") {
    return `Gere ${quantidade} ITENS no estilo CEBRASPE (Certo/Errado).

Banca: ${banca}
Matéria: ${materia}
Assunto: ${assunto}
Nível: ${nivel}
${orgao ? `Órgão: ${orgao}\n` : ""}${cargo ? `Cargo: ${cargo}\n` : ""}
${estilo}${focoErros}${antiDup}

Regras:
- Cada item é uma AFIRMATIVA única (sem alternativas A-E).
- Resposta é apenas "certo" ou "errado".
- Misture itens corretos e incorretos (proporção equilibrada).
- Use pegadinhas conceituais sutis nas afirmativas erradas (troca de palavras, exceções, generalizações).
- Inclua explicação detalhada (mínimo 3 frases) justificando o gabarito.
- Evite afirmativas óbvias ou triviais.

Use a tool "save_questions" para retornar o resultado.`;
  }

  return `Gere ${quantidade} questões de MÚLTIPLA ESCOLHA no estilo da banca ${banca}.

Matéria: ${materia}
Assunto: ${assunto}
Nível: ${nivel}
${orgao ? `Órgão: ${orgao}\n` : ""}${cargo ? `Cargo: ${cargo}\n` : ""}
${estilo}${focoErros}${antiDup}

Regras:
- 5 alternativas (A, B, C, D, E).
- Apenas 1 alternativa correta.
- Alternativas plausíveis (sem opções absurdas).
- Distribua as respostas corretas de forma variada entre as letras A, B, C, D e E ao longo do conjunto de questões.
- Inclua explicação detalhada (mínimo 3 frases) da resposta correta e por que as outras estão erradas.
- Evite questões genéricas; foque em situações realistas de prova.
- Diversifique os subtemas dentro do assunto.

Use a tool "save_questions" para retornar o resultado.`;
}

// ── Threshold de similaridade por disciplina ──────────────────────────────────
// Disciplinas jurídicas repetem naturalmente texto de lei → threshold mais alto
const DISCIPLINAS_JURIDICAS = /(direit|constituc|penal|civil|tribut|trabalh|admin|process)/i;

export function similarityThreshold(disciplina: string): number {
  return DISCIPLINAS_JURIDICAS.test(disciplina) ? 0.55 : 0.45;
}
