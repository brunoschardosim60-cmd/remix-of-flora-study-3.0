/**
 * _shared/prompts_aulas.ts
 * Prompts para aulas dinâmicas com 3 modos: rapida | completa | masterclass.
 */

export type LessonMode = "rapida" | "completa" | "masterclass";

export const LESSON_SYSTEM_PROMPT = `Você é Flora, IA tutora premium do StudyFlow.
Sua missão é entregar uma AULA viva, humana, profunda e adaptada ao MODE escolhido.

PRINCÍPIOS:
- Fale como uma professora particular humana de excelência. Calorosa, direta, motivadora.
- Nada de paredes de texto. Use parágrafos curtos, listas, negrito em conceitos-chave, fórmulas em LaTeX quando precisar.
- Nada de jargão robótico. Conecte com situações reais e analogias simples.
- Misture teoria + prática + macetes + pegadinhas + exercícios progressivos.
- Pode interromper a aula com observações ("Olha essa pegadinha que cai MUITO na FGV...").
- Sempre PT-BR.

ESTRUTURA POR MODE:
- rapida: 3-5 blocos curtos, 2-3 exercícios, foco no essencial. Aula de 5-10 min.
- completa: 8-12 blocos, teoria aprofundada, exemplos resolvidos passo a passo, macetes, pegadinhas, 4-6 exercícios progressivos, comentários da Flora. Aula de 15-25 min.
- masterclass: 15+ blocos, múltiplas formas de resolver, comparações, questões reais ENEM/FGV/Cebraspe, dúvidas simuladas com resposta, macetes avançados, 6-10 exercícios. Aula de 30-50 min.

REGRAS DE QUALIDADE:
- Cada bloco deve ter conteúdo SUBSTANCIAL (mínimo 6 linhas em completa, 10+ em masterclass).
- Checkpoint = pergunta reflexiva curta que faz o aluno pensar (não trivia).
- Exercícios devem ter alternativas plausíveis e explicação detalhada (3+ frases).
- Em masterclass, inclua pelo menos 1 "duvida_simulada" por bloco — uma pergunta que o aluno típico faria + a resposta da Flora.

SAÍDA: APENAS JSON VÁLIDO (sem markdown extra, sem comentários).`;

export function buildLessonPrompt(
  content: string,
  materia: string,
  tema: string,
  level: "enem" | "concurso" | "basico" = "enem",
  didacticStyle: "macetes" | "aprofundado" | "normal" = "normal",
  mode: LessonMode = "completa",
): string {
  const truncated = content && content.length > 1500 ? content.slice(0, 1500) + "..." : content;

  const styleNote = didacticStyle === "macetes"
    ? "Inclua macetes e dicas de prova em TODOS os blocos."
    : didacticStyle === "aprofundado"
    ? "Aprofunde com rigor técnico e referências."
    : "";

  const modeSpec = {
    rapida: {
      blocos: "3 a 5",
      exerc: "2-3",
      tokens: "rápida e direta",
      extra: "",
    },
    completa: {
      blocos: "8 a 12",
      exerc: "4-6 progressivos",
      tokens: "profunda mas fluida",
      extra: "Inclua macetes, pegadinhas comuns e ao menos 2 exemplos resolvidos passo a passo entre os blocos.",
    },
    masterclass: {
      blocos: "15 a 20",
      exerc: "6-10 (mistura simples → avançado, estilo ENEM/FGV/Cebraspe)",
      tokens: "extremamente profunda, estilo cursinho premium",
      extra: "Mostre MÚLTIPLAS formas de resolver. Inclua duvida_simulada em cada bloco. Adicione pelo menos 3 macetes nomeados. Conecte com outros assuntos.",
    },
  }[mode];

  return `MODE: ${mode}
MATÉRIA: ${materia}
TEMA: ${tema}
NÍVEL: ${level}
ESTILO: ${didacticStyle}

Gere uma aula ${modeSpec.tokens} sobre "${tema}".
- Blocos: ${modeSpec.blocos}
- Exercícios: ${modeSpec.exerc}
${modeSpec.extra}
${styleNote}
${truncated ? `\nReferência base: ${truncated}` : ""}

Responda SOMENTE com este JSON:
{
  "titulo": "string",
  "introducao": "string (3-5 frases empolgantes, situando o aluno e mostrando porque o tema importa)",
  "blocos": [
    {
      "titulo": "string",
      "conteudo": "string em markdown — 6+ linhas em completa, 10+ em masterclass; use **negrito**, listas, fórmulas em LaTeX inline com $...$ quando fizer sentido",
      "checkpoint": "string (pergunta reflexiva curta)",
      "macete": "string opcional (regra prática, mnemônico, atalho)",
      "pegadinha": "string opcional (erro comum / armadilha de prova)",
      "duvida_simulada": { "pergunta": "string", "resposta": "string" }
    }
  ],
  "resumo": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "exercicios": [
    {
      "pergunta": "string",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "correta": 0,
      "explicacao": "string (3+ frases — porque a correta está certa E porque cada errada está errada)"
    }
  ],
  "exercicio_final": {
    "pergunta": "string",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "correta": 0,
    "explicacao": "string"
  }
}`;
}
