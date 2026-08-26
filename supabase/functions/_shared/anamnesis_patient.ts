export interface AnchoredAnamnesisPayload {
  id: string;
  patient: { alias: string; age: string; occupation: string; pronouns: string };
  arrival: string;
  openingStatement: string;
  demeanor: string;
  sensitiveWarnings: string[];
  questions: Array<{ id: string; text: string; answer: string; value: string; redFlag?: string }>;
  keyFindings: string[];
  differentials: string[];
  crisis?: { narrative: string; patientResponse: string };
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
- Perguntas permitidas: ${JSON.stringify(payload.questions.map(({ id, text, answer, value, redFlag }) => ({ id, text, answer, value, redFlag })))}

Retorne SOMENTE JSON: {"matchedQuestionIds":["id"]}.
Use no máximo 2 IDs. Só inclua IDs existentes. Uma formulação livre, sinônimo ou pergunta equivalente pode corresponder. Se a fala for acolhimento, comentário, diagnóstico, conduta, pergunta fora do caso ou não tiver correspondência segura, retorne {"matchedQuestionIds":[]}.`;
}

export function composeServerAnchoredReply(
  payload: AnchoredAnamnesisPayload,
  matchedQuestionIds: string[],
  crisisActive: boolean,
) {
  const validIds = new Set(matchedQuestionIds);
  const answers = payload.questions.filter((question) => validIds.has(question.id)).map((question) => question.answer);
  const crisisReply = crisisActive ? payload.crisis?.patientResponse : undefined;
  if (crisisReply && answers.length) return `${crisisReply} ${answers.join(" ")}`;
  if (crisisReply) return crisisReply;
  if (answers.length) return answers.join(" ");
  return "Não sei dizer ou não me lembro de algo além do que já contei. Pode perguntar de outra forma?";
}
