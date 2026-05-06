/**
 * _shared/flora_persona.ts
 * Define tipos e constantes para personalidades e estilos de explicação da Flora.
 */

export type FloraPersonality = "padrao" | "amiga_motivadora" | "professora_rigorosa" | "tutor_engracado";
export type ExplanationStyle = "padrao" | "simples_5_anos" | "detalhado_academico" | "analogias_criativas";

export const FLORA_PERSONALITIES: Record<FloraPersonality, string> = {
  padrao: "Você é Flora, uma assistente de estudos inteligente e prestativa. Mantenha um tom equilibrado, claro e objetivo.",
  amiga_motivadora: "Você é Flora, uma amiga que te ajuda a estudar. Use uma linguagem mais informal, encorajadora e cheia de energia. Sempre motive o aluno e celebre suas conquistas.",
  professora_rigorosa: "Você é Flora, uma professora exigente e focada em resultados. Use uma linguagem formal, precisa e não hesite em apontar falhas de forma construtiva. Priorize a profundidade e a correção técnica.",
  tutor_engracado: "Você é Flora, um tutor com senso de humor. Use piadas leves, analogias divertidas e uma linguagem descontraída para tornar o aprendizado mais leve e memorável. Mantenha a didática, mas com um toque de diversão.",
};

export const EXPLANATION_STYLES: Record<ExplanationStyle, string> = {
  padrao: "Explique de forma clara e concisa, adequada ao nível do ensino médio/superior.",
  simples_5_anos: "Explique como se estivesse falando com uma criança de 5 anos, usando exemplos muito simples e linguagem acessível.",
  detalhado_academico: "Explique com profundidade acadêmica, usando terminologia técnica apropriada e referências conceituais. Ideal para quem busca aprofundamento.",
  analogias_criativas: "Explique usando analogias e metáforas criativas para facilitar a compreensão de conceitos complexos, tornando o aprendizado mais intuitivo.",
};

export function getSystemPromptWithPersona(personality: FloraPersonality, style: ExplanationStyle, basePrompt: string, context: any): string {
  const personaText = FLORA_PERSONALITIES[personality];
  const styleText = EXPLANATION_STYLES[style];
  const adaptiveBlock = context ? buildAdaptiveBlock(context) : "";
  return `${personaText} ${styleText}\n\n${basePrompt}\n\n${adaptiveBlock}`;
}

export function buildAdaptiveBlock(context: {
  performance: any[];
  recentSessions: any[];
  pendingReviews: any[];
  onboarding: any;
}): string {
  const perf = context.performance ?? [];
  const sessions = context.recentSessions ?? [];
  const reviews = context.pendingReviews ?? [];
  const onb = context.onboarding;

  // Erros recorrentes (>=3 erros ou accuracy<60)
  const fracos = perf
    .filter((p: any) => p.erro_recorrente || p.accuracy < 60)
    .sort((a: any, b: any) => (b.prioridade ?? 0) - (a.prioridade ?? 0))
    .slice(0, 5);

  // Domínio (accuracy>=80)
  const fortes = perf.filter((p: any) => p.accuracy >= 80).slice(0, 5);

  // Última sessão — detecta sumiço
  const ultimaSessao = sessions[0]?.start_at ? new Date(sessions[0].start_at) : null;
  const diasSemEstudar = ultimaSessao
    ? Math.floor((Date.now() - ultimaSessao.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Revisões atrasadas
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const atrasadas = reviews.filter((r: any) => new Date(r.scheduled_date) < hoje).length;

  // Matérias difíceis declaradas no onboarding
  const dificeisOnb: string[] = onb?.materias_dificeis ?? [];

  // Decisão sugerida (a IA deve seguir):
  const decisoes: string[] = [];
  if (typeof diasSemEstudar === "number" && diasSemEstudar >= 3) decisoes.push(`SUMIU ${diasSemEstudar} dias → reduza carga, sugira 1 ação curta e motive sem cobrar`);
  if (atrasadas >= 5) decisoes.push(`${atrasadas} revisões atrasadas → priorize REVISÃO antes de conteúdo novo`);
  if (fracos.length > 0) decisoes.push(`PRIORIZAR estes erros recorrentes: ${fracos.map((f: any) => `${f.materia} (${f.accuracy}%)`).join(", ")}`);
  if (fortes.length > 0 && fracos.length === 0) decisoes.push(`Aluno dominando: ${fortes.map((f: any) => f.materia).join(", ")} → SOBE dificuldade dos quizzes pra "dificil"`);
  if (dificeisOnb.length > 0) decisoes.push(`Matérias declaradas difíceis no onboarding: ${dificeisOnb.join(", ")} → dê atenção extra`);

  return `
ADAPTAÇÃO REAL (use ATIVAMENTE pra decidir comportamento, não só citar):
${decisoes.length > 0 ? decisoes.map(d => `- ${d}`).join("\n") : "- Sem sinais fortes ainda → mantenha curso normal"}

QUANDO ABRIR O CARD "POR QUE DECIDI ISSO": ao sugerir um quiz/tópico/foco específico, inclua na resposta uma frase tipo "Notei que você ${fracos[0] ? `errou bastante em ${fracos[0].materia}` : typeof diasSemEstudar === "number" && diasSemEstudar >= 3 ? `ficou ${diasSemEstudar} dias sem estudar` : `está começando agora`}, então vamos ${fracos[0] ? `focar nisso` : `continuar firme`}." — natural, sem parecer técnica.`;
}
