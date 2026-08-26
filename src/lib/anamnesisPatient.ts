import type { AnamnesisCase, AnamnesisQuestion } from "@/lib/anamnesisSimulation";

export interface AnamnesisConversationTurn {
  role: "student" | "patient";
  text: string;
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
): string {
  const validIds = new Set(matchedQuestionIds);
  const answers = clinicalCase.questions.filter((question) => validIds.has(question.id)).map((question) => question.answer);
  const crisisReply = crisisActive ? clinicalCase.crisisTrigger?.patientResponse : undefined;
  if (crisisReply && answers.length > 0) return `${crisisReply} ${answers.join(" ")}`;
  if (crisisReply) return crisisReply;
  if (answers.length > 0) return answers.join(" ");
  return "Não sei dizer ou não me lembro de algo além do que já contei. Pode perguntar de outra forma?";
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
