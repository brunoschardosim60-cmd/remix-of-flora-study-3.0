// Helpers puros do FloraChatPanel — sem dependência de React/DOM.
// Extraídos para reduzir o tamanho do componente e permitir testes diretos.

export interface FloraMessage {
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface FloraAction {
  type: string;
  payload: Record<string, unknown>;
}

export type Objetivo = "enem" | "vestibular" | "concurso" | "faculdade" | "aprender" | string;

export function getSuggestionChips(objetivo: Objetivo): string[] {
  switch (objetivo) {
    case "enem":
    case "vestibular":
      return ["Me ajuda a estudar", "Monta um cronograma", "Quero um quiz ENEM", "Simular questão ENEM", "Corrigir minha redação"];
    case "concurso":
      return ["Me ajuda a estudar", "Monta um cronograma", "Quiz de conhecimentos gerais", "Simular questão de concurso", "Corrigir minha redação"];
    case "faculdade":
      return ["Me ajuda a estudar", "Monta um cronograma", "Quero um quiz", "Explica um conceito", "Corrigir minha redação"];
    default:
      return ["Me ajuda a estudar", "Monta um cronograma", "Quero um quiz rápido", "Explica um conceito", "Corrigir minha redação"];
  }
}

/** Extrai bloco JSON balanceado a partir de uma posição. */
function extractBalancedJSON(text: string, startIdx: number): { json: string; endIdx: number } | null {
  if (text[startIdx] !== "{") return null;
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return { json: text.slice(startIdx, i + 1), endIdx: i + 1 }; }
  }
  return null;
}

/** Parseia tokens [AÇÃO:...]{...} do texto da Flora e retorna texto limpo + ações. */
export function parseFloraActions(text: string): { cleanText: string; actions: FloraAction[] } {
  const actions: FloraAction[] = [];
  let cleanText = text;
  const actionTokenRegex = /\[AÇÃO:(CRONOGRAMA|REMOVER_CRONOGRAMA|QUIZ|FLASHCARDS|POMODORO|CADERNO|META_DIA|IMAGEM|NAVEGAR)\]\s*/g;
  let match;
  const removals: { start: number; end: number }[] = [];
  while ((match = actionTokenRegex.exec(text)) !== null) {
    const afterToken = match.index + match[0].length;
    const braceStart = text.indexOf("{", afterToken - 1);
    if (braceStart !== -1 && braceStart <= afterToken + 2) {
      const extracted = extractBalancedJSON(text, braceStart);
      if (extracted) {
        try {
          const payload = JSON.parse(extracted.json);
          actions.push({ type: match[1], payload });
          removals.push({ start: match.index, end: extracted.endIdx });
        } catch { /* malformed */ }
      } else {
        removals.push({ start: match.index, end: text.length });
      }
    }
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    cleanText = cleanText.slice(0, removals[i].start) + cleanText.slice(removals[i].end);
  }
  cleanText = cleanText
    .replace(/[,\s]*\{["'\s]*(dia|dayOfWeek|horario|startTime|materia|subject|workMin|slots|frente|verso|pergunta|alternativas)["'\s]*\s*:[\s\S]*?\}(\s*\})?/g, "")
    .replace(/\[\s*\{["'\s]*(dia|dayOfWeek|horario|startTime|materia|subject|frente|pergunta)[\s\S]*?\]\s*/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*[\]}]+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { cleanText, actions };
}

export function sanitizeHistory(messages: FloraMessage[]): FloraMessage[] {
  return messages.map(m => {
    if (m.role !== "assistant") return m;
    const { cleanText } = parseFloraActions(m.content);
    return { ...m, content: cleanText };
  });
}
