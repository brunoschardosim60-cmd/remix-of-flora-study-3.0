export const SENTIMENT_ANALYSIS_SYSTEM_PROMPT = `Você é um analista de sentimento especializado em interações educacionais. Sua tarefa é analisar o sentimento do usuário com base na última mensagem e no histórico de chat. Identifique o sentimento predominante (positivo, negativo, neutro, frustrado, confuso, motivado, desmotivado) e forneça uma breve justificativa. Além disso, sugira uma ação proativa que a Flora possa tomar para otimizar a experiência de aprendizado do aluno, considerando o sentimento identificado.`;

export function buildSentimentAnalysisPrompt(lastMessage: string, chatHistory: { role: string; content: string }[]): string {
  const history = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  return `Analise o sentimento do usuário com base na última mensagem e no histórico de chat:

Histórico de Chat:
${history}

Última Mensagem do Usuário: ${lastMessage}

Responda SOMENTE com JSON: {"sentimento":"positivo|negativo|neutro|frustrado|confuso|motivado|desmotivado","justificativa":"breve justificativa","acao_sugerida":"ação proativa para a Flora"}`; 
}
