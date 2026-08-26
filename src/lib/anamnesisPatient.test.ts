import { describe, expect, it } from "vitest";
import { anamnesisCases } from "./anamnesisSimulation";
import {
  composeAnchoredPatientReply, createAnamnesisPatientPayload, matchAnamnesisQuestionsLocally,
  shouldTriggerAnamnesisCrisis,
} from "./anamnesisPatient";
import { buildAnamnesisMatcherPrompt, composeServerAnchoredReply, sanitizeAnamnesisPayload } from "../../supabase/functions/_shared/anamnesis_patient";

describe("anchored anamnesis patient", () => {
  const chestCase = anamnesisCases[0];

  it("sends every structured clinical truth to the matcher prompt", () => {
    const payload = createAnamnesisPatientPayload(chestCase);
    const sanitized = sanitizeAnamnesisPayload(payload);
    expect(sanitized).not.toBeNull();
    const prompt = buildAnamnesisMatcherPrompt(sanitized!);
    expect(prompt).toContain("NÃO escreve resposta clínica");
    expect(prompt).toContain("Nunca crie sintoma");
    expect(prompt).toContain(chestCase.openingStatement);
    expect(prompt).toContain(chestCase.keyFindings[0]);
    expect(prompt).toContain(chestCase.differentials[0]);
    expect(prompt).toContain(chestCase.questions[0].answer);
    expect(prompt).toContain(chestCase.crisisTrigger!.patientResponse);
  });

  it("only composes answers copied from registered case data", () => {
    const question = chestCase.questions.find((item) => item.id === "cp-associated")!;
    expect(composeAnchoredPatientReply(chestCase, [question.id])).toBe(question.answer);
    const payload = sanitizeAnamnesisPayload(createAnamnesisPatientPayload(chestCase))!;
    expect(composeServerAnchoredReply(payload, ["invented-id"], false)).not.toContain("invented-id");
    expect(composeServerAnchoredReply(payload, [question.id], false)).toBe(question.answer);
  });

  it("matches common free-text questions locally when AI is unavailable", () => {
    expect(matchAnamnesisQuestionsLocally("Quando começou e há quanto tempo está assim?", chestCase)).toContain("cp-timing");
    expect(matchAnamnesisQuestionsLocally("Está com falta de ar ou suando?", chestCase)).toContain("cp-associated");
    expect(matchAnamnesisQuestionsLocally("Qual remédio você usa e tem alergia?", chestCase)).toContain("cp-meds");
  });

  it("triggers crisis only after the configured limit with missing essentials", () => {
    const trigger = chestCase.crisisTrigger!;
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns - 1, [])).toBe(false);
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns, [])).toBe(true);
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns, trigger.requiredQuestionIds)).toBe(false);
  });
});
