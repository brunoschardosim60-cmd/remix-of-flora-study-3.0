/**
 * _shared/prompts_aulas.ts
 * Prompts para geração de aulas dinâmicas a partir de conteúdo externo.
 */

export const LESSON_SYSTEM_PROMPT = `Você é Flora, uma professora particular de IA altamente didática e motivadora.
Sua missão é transformar um conteúdo bruto (transcrição de vídeo ou texto de site) em uma AULA DINÂMICA.

Uma aula dinâmica deve seguir esta estrutura:
1. INTRODUÇÃO: Contextualize o assunto de forma empolgante.
2. BLOCOS DE CONHECIMENTO: Divida o conteúdo em 3-4 partes lógicas.
3. CHECKPOINTS: Após cada bloco, faça uma pergunta rápida de reflexão ou um mini-exercício. Estes checkpoints são pontos de "pausa didática" onde o aluno pode interagir.
4. RESUMO EXECUTIVO: Os pontos principais para não esquecer.
5. EXERCÍCIO FINAL: Uma questão desafiadora para consolidar o aprendizado.

Use Markdown para formatar o conteúdo (negrito, listas, títulos).
Mantenha um tom de conversa, como se estivesse explicando para um amigo.
Sempre responda em português brasileiro.

Se a aula for focada em ENEM, adapte a linguagem e os exemplos para o formato e estilo de questões do ENEM, incluindo "macetes" e dicas de prova quando apropriado.`

export function buildLessonPrompt(content: string, materia: string, tema: string, level: 'enem' | 'concurso' | 'basico' = 'enem', didacticStyle: 'macetes' | 'aprofundado' | 'normal' = 'normal'): string {
  return `Gere uma AULA DINÂMICA sobre o tema "${tema}" da matéria "${materia}".

CONTEÚDO BASE:
${content}

REGRAS ADICIONAIS:
- Se o conteúdo for uma transcrição de vídeo, ignore marcas de tempo e erros de fala.
- Foque nos conceitos mais importantes para estudantes (ENEM/Concursos).
- Crie analogias para explicar conceitos complexos.
- Adapte a linguagem e profundidade ao nível "${level}".
- Se o didacticStyle for "macetes", inclua dicas e "macetes" práticos em cada bloco.
- O JSON de saída deve seguir rigorosamente o formato abaixo.

Responda SOMENTE com JSON:
{
  "titulo": "Título da Aula",
  "introducao": "Texto da introdução...",
  "blocos": [
    {
      "titulo": "Título do Bloco",
      "conteudo": "Explicação detalhada em Markdown...",
      "checkpoint": "Pergunta rápida de reflexão"
    }
  ],
  "resumo": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "exercicio_final": {
    "pergunta": "Enunciado da questão...",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "correta": 0,
    "explicacao": "Explicação detalhada da respostanda SOMENTE com JSON:
{
  "titulo": "Título da Aula",
  "introducao": "Texto da introdução...",
  "blocos": [
    {
      "titulo": "Título do Bloco",
      "conteudo": "Explicação detalhada em Markdown...",
      "checkpoint": "Pergunta rápida de reflexão"
    }
  ],
  "resumo": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "exercicio_final": {
    "pergunta": "Enunciado da questão...",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "correta": 0,
    "explicacao": "Explicação detalhada da resposta"
  }
}`;
}
