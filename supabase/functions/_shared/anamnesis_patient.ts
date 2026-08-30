export interface AnchoredAnamnesisPayload {
  id: string;
  patient: { alias: string; age: string; occupation: string; pronouns: string };
  arrival: string;
  openingStatement: string;
  demeanor: string;
  sensitiveWarnings: string[];
  patientFacts: Array<{ id: string; label: string; questionExamples: string[]; answer: string }>;
  questions: Array<{ id: string; text: string; answer: string; value: string; redFlag?: string }>;
  keyFindings: string[];
  differentials: string[];
  crisis?: { narrative: string; patientResponse: string };
}

export type AnchoredInteractionIntent = "question" | "greeting" | "rapport" | "clarification" | "closing";

export interface AnchoredConversationTurn {
  role: "student" | "patient";
  text: string;
}

export interface AnchoredReplyContext {
  studentMessage?: string;
  conversation?: AnchoredConversationTurn[];
  interactionIntent?: AnchoredInteractionIntent;
  previouslyCoveredQuestionIds?: string[];
  matchedFactIds?: string[];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function chooseVariant(options: string[], seed: string) {
  const score = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return options[score % options.length];
}

export function detectAnchoredInteractionIntent(message: string): AnchoredInteractionIntent {
  const clean = normalize(message).trim();
  if (/\b(pode repetir|repita|nao entendi|como assim|diga de novo|fale de novo)\b/.test(clean)) return "clarification";
  if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(clean) && !/\b(o que|quando|onde|como|qual|quais|quem|quanto|tem|teve|sente|sentiu|usa|usou|esta|houve|pode|consegue)\b/.test(clean)) return "greeting";
  if (/\b(tchau|ate logo|vamos encerrar|encerrar a conversa|obrigad[oa] por tudo)\b/.test(clean)) return "closing";
  if (message.includes("?") || /^(quando|onde|como|qual|quais|quem|quanto|conte|descreva|explique|fale|tem|teve|sente|sentiu|usa|usou|esta|houve|ja teve|pode me contar|consegue)\b/.test(clean)) return "question";
  if (/\b(entendo|compreendo|certo|tudo bem|sinto muito|obrigad[oa]|calma|vou ajudar|estou aqui|pode ficar tranquil[oa])\b/.test(clean)) return "rapport";
  return "question";
}

export function sanitizeAnamnesisPayload(value: unknown): AnchoredAnamnesisPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const patient = raw.patient as Record<string, unknown> | undefined;
  const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 30) : [];
  if (typeof raw.id !== "string" || !patient || questions.length === 0) return null;

  const cleanQuestions = questions.map((item) => {
    const question = item as Record<string, unknown>;
    return {
      id: String(question.id ?? "").slice(0, 80),
      text: String(question.text ?? "").slice(0, 500),
      answer: String(question.answer ?? "").slice(0, 1200),
      value: String(question.value ?? "useful").slice(0, 20),
      redFlag: question.redFlag ? String(question.redFlag).slice(0, 500) : undefined,
    };
  }).filter((item) => item.id && item.text && item.answer);
  if (!cleanQuestions.length) return null;

  const list = (candidate: unknown, limit: number) => Array.isArray(candidate)
    ? candidate.slice(0, limit).map((item) => String(item).slice(0, 500))
    : [];
  const crisis = raw.crisis && typeof raw.crisis === "object" ? raw.crisis as Record<string, unknown> : undefined;
  const patientFacts = Array.isArray(raw.patientFacts) ? raw.patientFacts.slice(0, 20).map((item) => {
    const fact = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: String(fact.id ?? "").slice(0, 80),
      label: String(fact.label ?? "").slice(0, 100),
      questionExamples: list(fact.questionExamples, 8),
      answer: String(fact.answer ?? "").slice(0, 1000),
    };
  }).filter((fact) => fact.id && fact.label && fact.questionExamples.length && fact.answer) : [];

  return {
    id: raw.id.slice(0, 80),
    patient: {
      alias: String(patient.alias ?? "Paciente").slice(0, 80),
      age: String(patient.age ?? "").slice(0, 40),
      occupation: String(patient.occupation ?? "").slice(0, 80),
      pronouns: String(patient.pronouns ?? "").slice(0, 30),
    },
    arrival: String(raw.arrival ?? "").slice(0, 1000),
    openingStatement: String(raw.openingStatement ?? "").slice(0, 1000),
    demeanor: String(raw.demeanor ?? "").slice(0, 800),
    sensitiveWarnings: list(raw.sensitiveWarnings, 10),
    patientFacts,
    questions: cleanQuestions,
    keyFindings: list(raw.keyFindings, 20),
    differentials: list(raw.differentials, 20),
    crisis: crisis ? {
      narrative: String(crisis.narrative ?? "").slice(0, 1000),
      patientResponse: String(crisis.patientResponse ?? "").slice(0, 1000),
    } : undefined,
  };
}

export function buildAnamnesisMatcherPrompt(payload: AnchoredAnamnesisPayload) {
  return `Você é um classificador clínico estritamente ancorado para uma simulação educacional de anamnese.

REGRA ABSOLUTA: você NÃO interpreta o paciente e NÃO escreve resposta clínica. Apenas reconhece quais perguntas cadastradas o texto do aluno cobre. Nunca crie sintoma, exame, antecedente, diagnóstico, horário, medicamento ou fato novo.

VERDADE ÚNICA DO CASO:
- Paciente: ${JSON.stringify(payload.patient)}
- Chegada: ${payload.arrival}
- Fala inicial: ${payload.openingStatement}
- Comportamento: ${payload.demeanor}
- Alertas sensíveis: ${JSON.stringify(payload.sensitiveWarnings)}
- Achados-chave: ${JSON.stringify(payload.keyFindings)}
- Diferenciais educacionais: ${JSON.stringify(payload.differentials)}
- Crise cadastrada: ${JSON.stringify(payload.crisis ?? null)}
- Fatos pessoais permitidos: ${JSON.stringify(payload.patientFacts)}
- Perguntas permitidas: ${JSON.stringify(payload.questions.map(({ id, text, answer, value, redFlag }) => ({ id, text, answer, value, redFlag })))}

Retorne SOMENTE JSON: {"matchedQuestionIds":["id"],"matchedFactIds":["id"],"interactionIntent":"question"}.
Use no máximo 2 IDs em cada lista. Só inclua IDs existentes. Uma formulação livre, sinônimo ou pergunta equivalente pode corresponder. Perguntas sobre nome, idade, moradia, profissão e estado atual devem usar os fatos pessoais correspondentes. Se a fala for acolhimento, comentário, diagnóstico, conduta, pergunta fora do caso ou não tiver correspondência segura, retorne IDs vazios e o interactionIntent correspondente.
interactionIntent deve ser um destes valores: "question", "greeting", "rapport", "clarification" ou "closing". Cumprimentos, acolhimento e comentários não devem revelar novamente uma resposta clínica já dada.`;
}

export function composeServerAnchoredReply(
  payload: AnchoredAnamnesisPayload,
  matchedQuestionIds: string[],
  crisisActive: boolean,
  context: AnchoredReplyContext = {},
) {
  const validIds = new Set(matchedQuestionIds);
  const validFactIds = new Set(context.matchedFactIds ?? []);
  const factAnswers = payload.patientFacts.filter((fact) => validFactIds.has(fact.id)).map((fact) => fact.answer);
  const questionAnswers = payload.questions.filter((question) => validIds.has(question.id)).map((question) => question.answer);
  const answers = [...factAnswers, ...questionAnswers];
  const crisisReply = crisisActive ? payload.crisis?.patientResponse : undefined;
  const conversation = context.conversation ?? [];
  const patientTurns = conversation.filter((turn) => turn.role === "patient").map((turn) => turn.text);
  const alreadySaid = (text: string) => patientTurns.some((turn) => normalize(turn).includes(normalize(text)));
  const seed = `${context.studentMessage ?? ""}:${conversation.length}`;
  const intent = context.interactionIntent ?? detectAnchoredInteractionIntent(context.studentMessage ?? "");

  if (crisisReply && !alreadySaid(crisisReply)) return answers.length ? `${crisisReply} ${answers.join(" ")}` : crisisReply;

  if (intent === "clarification") {
    const lastPatientTurn = patientTurns.at(-1);
    if (lastPatientTurn) {
      const cleanLastTurn = lastPatientTurn.replace(/^(Claro\. Posso repetir:|Posso repetir:)\s*/i, "");
      return `Claro. Posso repetir: ${cleanLastTurn}`;
    }
  }
  if (intent === "greeting") return chooseVariant([
    "Olá. Pode perguntar; vou responder o que eu souber.",
    "Oi. Estou ouvindo, pode começar.",
    "Olá. Pode conduzir a entrevista.",
  ], seed);
  if (intent === "rapport") return chooseVariant([
    "Obrigado por me ouvir. Pode continuar.",
    "Certo. Estou acompanhando; pode perguntar.",
    "Tudo bem. Pode continuar a entrevista.",
  ], seed);
  if (intent === "closing") return chooseVariant([
    "Certo, obrigado por me ouvir.",
    "Tudo bem. Obrigado pela conversa.",
    "Obrigado. Espero ter conseguido explicar.",
  ], seed);

  if (answers.length) {
    const answerText = answers.join(" ");
    const previouslyCovered = new Set(context.previouslyCoveredQuestionIds ?? []);
    const repeated = (matchedQuestionIds.length > 0 && matchedQuestionIds.every((id) => previouslyCovered.has(id))) || answers.every(alreadySaid);
    if (repeated) return chooseVariant([
      `Claro: ${answerText}`,
      `Sim. ${answerText}`,
      answerText,
    ], seed);
    if (factAnswers.length) return answerText;
    return chooseVariant([
      answerText,
      `Então... ${answerText}`,
      `Pois é... ${answerText}`,
    ], seed);
  }

  return chooseVariant([
    "Desculpe, não entendi bem. Pode me perguntar de outro jeito?",
    "Não entendi o que você quis saber. Pode explicar melhor?",
    "Acho que não entendi a pergunta. Pode fazer de outra forma?",
  ], seed);
}
