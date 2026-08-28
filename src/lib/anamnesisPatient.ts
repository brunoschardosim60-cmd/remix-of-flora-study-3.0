import type { AnamnesisCase, AnamnesisQuestion } from "@/lib/anamnesisSimulation";

export interface AnamnesisConversationTurn {
  role: "student" | "patient";
  text: string;
}

export type AnamnesisInteractionIntent = "question" | "greeting" | "rapport" | "clarification" | "closing";

export interface AnamnesisReplyContext {
  studentMessage?: string;
  conversation?: AnamnesisConversationTurn[];
  interactionIntent?: AnamnesisInteractionIntent;
  previouslyCoveredQuestionIds?: string[];
}

export interface AnamnesisPatientPayload {
  id: string;
  patient: AnamnesisCase["patient"];
  arrival: string;
  openingStatement: string;
  demeanor: string;
  sensitiveWarnings: string[];
  questions: Array<Pick<AnamnesisQuestion, "id" | "text" | "answer" | "value" | "redFlag">>;
  keyFindings: string[];
  differentials: string[];
  crisis?: {
    narrative: string;
    patientResponse: string;
  };
}

export interface AnamnesisPatientResponse {
  reply: string;
  coveredQuestionIds: string[];
  anchored: true;
  interactionIntent?: AnamnesisInteractionIntent;
  usedFallback?: boolean;
}

const STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "ela", "ele", "em", "esta",
  "esse", "foi", "há", "isso", "já", "mais", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "qual",
  "que", "se", "seu", "sua", "tem", "teve", "um", "uma", "você",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokens(value: string) {
  return normalize(value).split(/\s+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function chooseVariant(options: string[], seed: string) {
  const score = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return options[score % options.length];
}

export function detectAnamnesisInteractionIntent(message: string): AnamnesisInteractionIntent {
  const clean = normalize(message).trim();
  if (/\b(pode repetir|repita|nao entendi|como assim|diga de novo|fale de novo)\b/.test(clean)) return "clarification";
  if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(clean) && !/\b(o que|quando|onde|como|qual|quais|quem|quanto|tem|teve|sente|sentiu|usa|usou|esta|houve|pode|consegue)\b/.test(clean)) return "greeting";
  if (/\b(tchau|ate logo|vamos encerrar|encerrar a conversa|obrigad[oa] por tudo)\b/.test(clean)) return "closing";
  if (message.includes("?") || /^(quando|onde|como|qual|quais|quem|quanto|conte|descreva|explique|fale|tem|teve|sente|sentiu|usa|usou|esta|houve|ja teve|pode me contar|consegue)\b/.test(clean)) return "question";
  if (/\b(entendo|compreendo|certo|tudo bem|sinto muito|obrigad[oa]|calma|vou ajudar|estou aqui|pode ficar tranquil[oa])\b/.test(clean)) return "rapport";
  return "question";
}

const INTENT_ALIASES: Record<string, string[]> = {
  timing: ["quando", "comecou", "tempo", "inicio", "duracao", "melhora", "piora"],
  associated: ["falta", "ar", "suor", "nausea", "desmaio", "tontura", "fraqueza", "sintoma"],
  meds: ["remedio", "medicamento", "alergia", "anticoagulante", "tratamento"],
  prior: ["antes", "anterior", "antecedente", "historico", "cirurgia", "avc", "infarto"],
  family: ["familia", "familiar", "pai", "mae", "irmao"],
  substances: ["alcool", "bebida", "fuma", "cigarro", "droga", "substancia"],
  safety: ["seguro", "seguranca", "machucou", "pressionou"],
  pregnancy: ["gravida", "gravidez", "gestacao", "menstruacao", "teste"],
  bleeding: ["sangramento", "sangue", "coagulo", "desmaio"],
  pain: ["dor", "doendo", "local", "lado", "intensidade"],
  direct: ["morrer", "morte", "suicidio", "vida"],
  plan: ["plano", "planejou", "preparou", "quando"],
  means: ["acesso", "meio", "usar", "quarto"],
};

function aliasTokens(question: AnamnesisPatientPayload["questions"][number]) {
  const suffix = question.id.split("-").slice(1).join("-");
  return Object.entries(INTENT_ALIASES)
    .filter(([intent]) => suffix.includes(intent))
    .flatMap(([, aliases]) => aliases);
}

export function createAnamnesisPatientPayload(clinicalCase: AnamnesisCase): AnamnesisPatientPayload {
  return {
    id: clinicalCase.id,
    patient: clinicalCase.patient,
    arrival: clinicalCase.arrival,
    openingStatement: clinicalCase.openingStatement,
    demeanor: clinicalCase.demeanor,
    sensitiveWarnings: clinicalCase.sensitiveWarnings ?? [],
    questions: clinicalCase.questions.map(({ id, text, answer, value, redFlag }) => ({ id, text, answer, value, redFlag })),
    keyFindings: clinicalCase.keyFindings,
    differentials: clinicalCase.differentials,
    crisis: clinicalCase.crisisTrigger ? {
      narrative: clinicalCase.crisisTrigger.narrative,
      patientResponse: clinicalCase.crisisTrigger.patientResponse,
    } : undefined,
  };
}

export function matchAnamnesisQuestionsLocally(
  message: string,
  clinicalCase: AnamnesisCase,
  limit = 2,
): string[] {
  if (detectAnamnesisInteractionIntent(message) !== "question") return [];
  const messageTokens = new Set(tokens(message));
  if (messageTokens.size === 0) return [];

  return clinicalCase.questions
    .map((question) => {
      const candidateTokens = new Set([...tokens(question.text), ...aliasTokens(question)]);
      const overlap = [...candidateTokens].filter((token) => messageTokens.has(token));
      const phraseBonus = normalize(question.text).includes(normalize(message)) || normalize(message).includes(normalize(question.text)) ? 4 : 0;
      return { id: question.id, score: overlap.length + phraseBonus };
    })
    .filter((candidate) => candidate.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate) => candidate.id);
}

export function composeAnchoredPatientReply(
  clinicalCase: AnamnesisCase,
  matchedQuestionIds: string[],
  crisisActive = false,
  context: AnamnesisReplyContext = {},
): string {
  const validIds = new Set(matchedQuestionIds);
  const answers = clinicalCase.questions.filter((question) => validIds.has(question.id)).map((question) => question.answer);
  const crisisReply = crisisActive ? clinicalCase.crisisTrigger?.patientResponse : undefined;
  const conversation = context.conversation ?? [];
  const patientTurns = conversation.filter((turn) => turn.role === "patient").map((turn) => turn.text);
  const alreadySaid = (text: string) => patientTurns.some((turn) => normalize(turn).includes(normalize(text)));
  const seed = `${context.studentMessage ?? ""}:${conversation.length}`;
  const intent = context.interactionIntent ?? detectAnamnesisInteractionIntent(context.studentMessage ?? "");

  if (crisisReply && !alreadySaid(crisisReply)) return answers.length > 0 ? `${crisisReply} ${answers.join(" ")}` : crisisReply;

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

  if (answers.length > 0) {
    const answerText = answers.join(" ");
    const previouslyCovered = new Set(context.previouslyCoveredQuestionIds ?? []);
    const repeated = (matchedQuestionIds.length > 0 && matchedQuestionIds.every((id) => previouslyCovered.has(id))) || answers.every(alreadySaid);
    if (repeated) return chooseVariant([
      `Posso repetir: ${answerText}`,
      `É o mesmo que contei antes: ${answerText}`,
      `Não tenho outro detalhe sobre isso. O que lembro é: ${answerText}`,
    ], seed);
    return chooseVariant([
      answerText,
      `Sobre isso: ${answerText}`,
      `O que consigo contar é o seguinte: ${answerText}`,
    ], seed);
  }

  return chooseVariant([
    "Não sei responder isso com segurança. Pode perguntar de outra forma?",
    "Não tenho certeza sobre isso. Se quiser, faça uma pergunta mais específica.",
    "Não me lembro de algo sobre isso além do que já contei. Pode tentar de outro jeito?",
  ], seed);
}

export function shouldTriggerAnamnesisCrisis(
  clinicalCase: AnamnesisCase,
  studentTurnCount: number,
  coveredQuestionIds: string[],
) {
  const trigger = clinicalCase.crisisTrigger;
  if (!trigger || studentTurnCount < trigger.afterTurns) return false;
  const covered = new Set(coveredQuestionIds);
  return trigger.requiredQuestionIds.some((id) => !covered.has(id));
}
