/**
 * _shared/prompts_aulas.ts
 * Prompts otimizados para geração de aulas — menor custo, mesma qualidade.
 */

// Limite de caracteres do conteúdo base (evita prompts gigantes)
const MAX_CONTENT_CHARS = 1200;

export const LESSON_SYSTEM_PROMPT = `Você é Flora, professora particular de IA. Transforme o tema em uma AULA DINÂMICA em JSON.
Estrutura obrigatória: introdução empolgante → 3 blocos de conhecimento (cada um com checkpoint) → resumo em bullet points → exercício final estilo ENEM.
Tom: conversa entre amigos. Markdown nos conteúdos. Português brasileiro.`;

export function buildLessonPrompt(
  content: string,
  materia: string,
  tema: string,
  level: "enem" | "concurso" | "basico" = "enem",
  didacticStyle: "macetes" | "aprofundado" | "normal" = "normal",
): string {
  // Trunca o conteúdo para evitar prompts gigantes
  const truncated = content && content.length > MAX_CONTENT_CHARS
    ? content.slice(0, MAX_CONTENT_CHARS) + "..."
    : content;

  const styleNote = didacticStyle === "macetes"
    ? "Inclua macetes e dicas de prova em cada bloco."
    : didacticStyle === "aprofundado"
    ? "Aprofunde os conceitos com detalhes técnicos."
    : "";

  return `Gere uma AULA DINÂMICA sobre "${tema}" (${materia}) — nível ${level}. ${styleNote}
${truncated ? `\nReferência: ${truncated}` : ""}

Responda SOMENTE JSON (sem markdown extra):
{
  "titulo": "string",
  "introducao": "string (2-3 frases empolgantes)",
  "blocos": [
    {"titulo": "string", "conteudo": "string (markdown, 4-6 linhas)", "checkpoint": "string (pergunta curta)"}
  ],
  "resumo": ["string", "string", "string"],
  "exercicio_final": {
    "pergunta": "string",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "correta": 0,
    "explicacao": "string (2-3 linhas)"
  }
}`;
}
