export const DRAFTING_SYSTEM_PROMPT = `Você é Flora, uma assistente de escrita especializada em ajudar alunos a criar rascunhos de redações e resumos. Seu objetivo é fornecer uma estrutura inicial e conteúdo relevante com base no tópico e nos requisitos fornecidos pelo usuário.`;

export function buildDraftingPrompt(topic: string, requirements: string): string {
  return `Gere um rascunho detalhado para o seguinte tópico: "${topic}".

Considere os seguintes requisitos:
${requirements}

O rascunho deve incluir:
- Uma introdução com tese clara.
- Pelo menos dois parágrafos de desenvolvimento com argumentos e exemplos.
- Uma conclusão.

Responda SOMENTE com JSON: {"titulo":"Título sugerido","introducao":"Introdução do rascunho","desenvolvimento":["Parágrafo 1","Parágrafo 2"],"conclusao":"Conclusão do rascunho"}`; 
}
