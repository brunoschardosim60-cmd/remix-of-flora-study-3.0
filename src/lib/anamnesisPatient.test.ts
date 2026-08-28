import { describe, expect, it } from "vitest";
import { anamnesisCases } from "./anamnesisSimulation";
import {
  composeAnchoredPatientReply, createAnamnesisPatientPayload, detectAnamnesisInteractionIntent, matchAnamnesisQuestionsLocally,
  shouldTriggerAnamnesisCrisis,
} from "./anamnesisPatient";
import { buildAnamnesisMatcherPrompt, composeServerAnchoredReply, detectAnchoredInteractionIntent, sanitizeAnamnesisPayload } from "../../supabase/functions/_shared/anamnesis_patient";

describe("anchored anamnesis patient", () => {
  const chestCase = anamnesisCases[0];

  it("sends every structured clinical truth to the matcher prompt", () => {
    const payload = createAnamnesisPatientPayload(chestCase);
    const sanitized = sanitizeAnamnesisPayload(payload);
    expect(sanitized).not.toBeNull();
    const prompt = buildAnamnesisMatcherPrompt(sanitized!);
    expect(prompt).toContain("NÃO escreve resposta clínica");
    expect(prompt).toContain("Nunca crie sintoma");
    expect(prompt).toContain("interactionIntent");
    expect(prompt).toContain(chestCase.openingStatement);
    expect(prompt).toContain(chestCase.keyFindings[0]);
    expect(prompt).toContain(chestCase.differentials[0]);
    expect(prompt).toContain(chestCase.questions[0].answer);
    expect(prompt).toContain(chestCase.crisisTrigger!.patientResponse);
  });

  it("only composes answers copied from registered case data", () => {
    const question = chestCase.questions.find((item) => item.id === "cp-associated")!;
    expect(composeAnchoredPatientReply(chestCase, [question.id])).toContain(question.answer);
    const payload = sanitizeAnamnesisPayload(createAnamnesisPatientPayload(chestCase))!;
    expect(composeServerAnchoredReply(payload, ["invented-id"], false)).not.toContain("invented-id");
    expect(composeServerAnchoredReply(payload, [question.id], false)).toContain(question.answer);
  });

  it("matches common free-text questions locally when AI is unavailable", () => {
    expect(matchAnamnesisQuestionsLocally("Quando começou e há quanto tempo está assim?", chestCase)).toContain("cp-timing");
    expect(matchAnamnesisQuestionsLocally("Está com falta de ar ou suando?", chestCase)).toContain("cp-associated");
    expect(matchAnamnesisQuestionsLocally("Qual remédio você usa e tem alergia?", chestCase)).toContain("cp-meds");
  });

  it("treats rapport, greetings and clarification as conversation instead of clinical disclosure", () => {
    expect(detectAnamnesisInteractionIntent("Oi, bom dia")).toBe("greeting");
    expect(detectAnamnesisInteractionIntent("Oi, o que você está sentindo?")).toBe("question");
    expect(detectAnamnesisInteractionIntent("Entendo, sinto muito pelo que aconteceu.")).toBe("rapport");
    expect(detectAnamnesisInteractionIntent("Não entendi, pode repetir?")).toBe("clarification");
    expect(detectAnchoredInteractionIntent("Obrigado por tudo, até logo")).toBe("closing");
    expect(matchAnamnesisQuestionsLocally("Entendo, estou aqui para ajudar.", chestCase)).toEqual([]);

    const conversation = [{ role: "patient" as const, text: chestCase.openingStatement }];
    expect(composeAnchoredPatientReply(chestCase, [], false, {
      studentMessage: "Entendo, sinto muito.",
      conversation,
    })).toMatch(/Pode continuar|pode perguntar|continuar a entrevista/);
    expect(composeAnchoredPatientReply(chestCase, [], false, {
      studentMessage: "Pode repetir?",
      conversation,
    })).toContain(chestCase.openingStatement);
  });

  it("does not return an identical bubble when a registered answer is asked again", () => {
    const question = chestCase.questions.find((item) => item.id === "cp-associated")!;
    const conversation = [
      { role: "student" as const, text: question.text },
      { role: "patient" as const, text: question.answer },
    ];
    const localReply = composeAnchoredPatientReply(chestCase, [question.id], false, {
      studentMessage: "Pode me explicar esses sintomas de novo?",
      conversation,
      previouslyCoveredQuestionIds: [question.id],
    });
    expect(localReply).not.toBe(question.answer);
    expect(localReply).toContain(question.answer);

    const payload = sanitizeAnamnesisPayload(createAnamnesisPatientPayload(chestCase))!;
    const serverReply = composeServerAnchoredReply(payload, [question.id], false, {
      studentMessage: "E os sintomas associados?",
      conversation,
      previouslyCoveredQuestionIds: [question.id],
    });
    expect(serverReply).not.toBe(question.answer);
    expect(serverReply).toContain(question.answer);
  });

  it("announces a registered crisis once without repeating it on every later turn", () => {
    const crisisReply = chestCase.crisisTrigger!.patientResponse;
    expect(composeAnchoredPatientReply(chestCase, [], true, {
      studentMessage: "Como você está agora?",
      conversation: [],
    })).toBe(crisisReply);
    expect(composeAnchoredPatientReply(chestCase, [], true, {
      studentMessage: "Entendo, continue.",
      conversation: [{ role: "patient", text: crisisReply }],
    })).not.toBe(crisisReply);
  });

  it("triggers crisis only after the configured limit with missing essentials", () => {
    const trigger = chestCase.crisisTrigger!;
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns - 1, [])).toBe(false);
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns, [])).toBe(true);
    expect(shouldTriggerAnamnesisCrisis(chestCase, trigger.afterTurns, trigger.requiredQuestionIds)).toBe(false);
  });
});
